import * as fs from 'fs';

import { Config } from '../config';
import { a } from '../helpers/cli';
import {
    dockerBuild, dockerContainerExists, dockerCreateNetwork, dockerDeleteNetwork,
    dockerNetworkExists, dockerPush, dockerRemoveContainer, dockerRun, dockerRunAsync,
    DockerRunOptions, helmDelete, helmInstall, telepresenceRunAsync, TelepresenceRunOptions, telepresenceVersion,
} from '../helpers/commands';
import { generateMountsScript } from '../helpers/mount';
import { needsCluster, needsCommand, needsNamespace } from '../helpers/require';
import {
    getServiceDir, initBranch, maybeTryBranch, reqDependencies,
    resolveBranchName, SigIntHandler, testServiceFiles,
} from '../helpers/service';
import * as buildContainer from '../serviceTypes/buildContainer/module';
import * as dockerDeployment from '../serviceTypes/dockerDeployment/module';
import * as dockerImage from '../serviceTypes/dockerImage/module';
import * as pureHelm from '../serviceTypes/pureHelm/module';

export function runDevReqs(
    config: Config,
    serviceName: string,
    branchName: string,
    [debugContainer]: string[],
    context: any,
): boolean {
    const service = config.services[serviceName];

    const usedBranchName = resolveBranchName(branchName, service.branches);
    const branchBase = service.branches[usedBranchName];

    if (branchBase.dev === undefined) {
        console.error(a`\{lr Cannot run service \{lw ${serviceName}\} on ${''
            }branch \{lg ${usedBranchName}\} in \{c dev\} mode\}`);
        maybeTryBranch(service, usedBranchName, 'dev');
        return false;
    }
    const branch = branchBase.dev;

    if (!testServiceFiles(serviceName, branchBase.type)) {
        return false;
    }

    let reqsMet = true;

    if (branch instanceof dockerImage.DevBranch) {
        reqsMet = needsCommand(context, 'docker');
    } else if (branch instanceof pureHelm.DevBranch) {
        // Don't check for cluster if helm isn't installed
        reqsMet = needsCommand(context, 'helm') &&
            needsCluster(context, branch.cluster);
    } else if (branch instanceof dockerDeployment.DevBranch) {
        reqsMet = needsCommand(context, 'docker');

        if (branch.mode === 'proxy') {
            // Check for helm regardless of if docker is installed, but
            // don't check for cluster if helm isn't installed
            reqsMet = needsCommand(context, 'helm') &&
                needsCluster(context, branch.cluster) &&
                reqsMet;

            if (debugContainer) {
                reqsMet = reqsMet && needsCommand(context, 'telepresence');
            }
        }
    } else if (branch instanceof buildContainer.DevBranch) {
        reqsMet = needsCommand(context, 'docker');
    }

    if (reqsMet) {
        reqsMet = reqDependencies(config, branchName, branch, runDevReqs, context);
    }

    return reqsMet;
}

export async function runDev(
    config: Config,
    serviceName: string,
    branchName: string,
    handlers: SigIntHandler[],
    isAsync: () => void,
    [debugContainer]: string[],
): Promise<undefined | false> {
    const service = config.services[serviceName];

    const serviceFolder = getServiceDir(serviceName);
    const usedBranchName = resolveBranchName(branchName, service.branches);
    const branchBase = service.branches[usedBranchName];
    const branch = branchBase.dev!; // handled in reqs function

    const initResult = await initBranch({
        branch, branchName, serviceName, serviceFolder, isAsync,
        usedBranchName, handlers, config, branchType: branchBase.type,
    }, runDev, 'dev');
    if (initResult === false) {
        return false;
    }

    if (branch instanceof dockerImage.DevBranch) {
        if (debugContainer !== undefined) {
            console.log(a`\{ly Warn:\} ignoring 'debug-container' parameter`);
        }

        // Docker build
        if (!dockerBuild(serviceFolder, `${config.project}/${branch.imageName}`, undefined, branch.dockerArgs)) {
            return false;
        }
    } else if (branch instanceof pureHelm.DevBranch) {
        if (debugContainer !== undefined) {
            console.log(a`\{ly Warn:\} ignoring 'debug-container' parameter`);
        }

        // Create namespace if it doesn't exist
        if (!needsNamespace(branch.cluster, branch.namespace)) {
            return false;
        }

        // Helm chart run w/ vars
        const helmContext = {
            branch,
            env: 'dev',
        };

        if (!helmInstall(serviceFolder, helmContext, `${config.project}-${serviceName}-dev`)) {
            return false;
        }
    } else if (branch instanceof dockerDeployment.DevBranch) {
        const containers = fs.readdirSync(`${serviceFolder}/docker`)
            .filter((dir) => fs.statSync(`${serviceFolder}/docker/${dir}`).isDirectory());
        const containerDirs = containers.map((dir) => `${serviceFolder}/docker/${dir}`);
        const dockerImages: {[container: string]: string} = {};

        if (debugContainer && !containers.includes(debugContainer)) {
            console.error(a`\{lr Could not find dev container \{lw ${debugContainer}\}\}`);
            return false;
        }

        // Docker builds
        for (const index in containers) {
            const dirname = containers[index];
            const dir = containerDirs[index];
            const prefix = branch.imageNamePrefix || serviceName;
            const image = `${config.project}/${prefix}-${dirname}`;
            let args;

            dockerImages[dirname] = `${image}:dev`;

            if (dirname in branch.containers) {
                args = branch.containers[dirname].dockerArgs;
            }

            if (!dockerBuild(dir, image, 'dev', args)) {
                return false;
            }
        }

        // Detect development mode
        if (branch.mode === 'proxy') {
            // Docker pushes
            for (const dirname of containers) {
                const image = dockerImages[dirname];

                // Skip pushing current debug container?
                if (debugContainer && !branch.pushDebugContainer && dirname === debugContainer) {
                    continue;
                }

                if (!dockerPush(image, branch.registry)) {
                    return false;
                }
            }

            // Create namespace if it doesn't exist
            if (!needsNamespace(branch.cluster, branch.namespace)) {
                return false;
            }

            const helmDockerImages = {...dockerImages};
            if (debugContainer) {
                helmDockerImages[debugContainer] = `datawire/telepresence-k8s:${telepresenceVersion()}`;
            }

            // Helm chart run w/ vars
            const helmContext = {
                branch,
                dockerImages: helmDockerImages,
                telepresenceContainer: debugContainer,
                env: 'dev',
            };

            if (!helmInstall(`${serviceFolder}/helm`, helmContext, `${config.project}-${serviceName}-dev`)) {
                return false;
            }

            // Delete helm stuff on exit
            if (branch.autodelete) {
                handlers.push(async () => helmDelete(helmContext, `${config.project}-${serviceName}-dev`) && undefined);
            }

            // Telepresence instance?
            if (debugContainer) {
                const prefix = branch.imageNamePrefix || serviceName;
                const image = `${config.project}/${prefix}-${debugContainer}:dev`;
                const containerName = `${serviceName}-${debugContainer}-dev`;

                const runOpts: TelepresenceRunOptions = {
                    cluster: branch.cluster,
                    deployment: `${config.project}-${serviceName}-dev`,
                    container: debugContainer,
                    namespace: branch.namespace,

                    image,
                    name: containerName,
                    volumes: {},
                    rm: true,
                };

                if (debugContainer in branch.containers) {
                    const container = branch.containers[debugContainer];

                    if (container.volumes !== undefined) {
                        runOpts.volumes = container.volumes;
                    }
                    if (container.ports !== undefined) {
                        runOpts.ports = container.ports;
                    }
                    if (container.k8sVolumes !== undefined && container.debugCMD !== undefined) {
                        const bootstrapFile = generateMountsScript(
                            serviceName,
                            debugContainer,
                            container.k8sVolumes,
                            container.debugCMD,
                        );

                        runOpts.volumes![bootstrapFile] = '/tmp/debugRun.sh';
                        runOpts.command = '/tmp/debugRun.sh';
                    } else if (container.debugCMD !== undefined) {
                        runOpts.command = container.debugCMD;
                    } else if (container.k8sVolumes !== undefined) {
                        console.log(a`\{ly Ignoring \{y k8sVolumes\} for container \{lw ${debugContainer
                            }\} because \{y debugCMD\} is not set\}`);
                    }
                }

                handlers.push(telepresenceRunAsync(runOpts));
            }
        } else {
            const networkName = `fmdev-${serviceName}`;
            const ownsNetwork = !dockerNetworkExists(networkName);

            if (ownsNetwork) {
                // Docker network create
                if (!dockerCreateNetwork(networkName)) {
                    return false;
                }
                handlers.push(async () => {
                    if (!dockerDeleteNetwork(networkName)) {
                        return false;
                    }
                });
            }

            // Docker runs w/ volumes and network
            for (const index in containerDirs) {
                const dirname = containers[index];
                const image = dockerImages[index];
                const containerName = `${config.project}-${serviceName}-${dirname}-dev`;

                if (dockerContainerExists(containerName)) {
                    dockerRemoveContainer(containerName);
                }

                const runOpts: DockerRunOptions = {
                    image,
                    name: containerName,
                    network: networkName,
                    rm: true,
                };

                if (dirname in branch.containers) {
                    const container = branch.containers[dirname];

                    if (container.volumes !== undefined) {
                        runOpts.volumes = container.volumes;
                    }
                    if (container.ports !== undefined) {
                        runOpts.ports = container.ports;
                    }
                }

                handlers.push(dockerRunAsync(runOpts));
            }
        }

        isAsync();
    } else if (branch instanceof buildContainer.DevBranch) {
        if (debugContainer !== undefined) {
            console.log(a`\{ly Warn:\} ignoring 'debug-container' parameter`);
        }

        const image = `fmbuild-${serviceName}`;

        if (!dockerBuild(serviceFolder, image, undefined, branch.dockerArgs)) {
            return false;
        }

        const runOpts: DockerRunOptions = {
            image,
            name: image,
            rm: true,
            volumes: branch.volumes,
        };

        if (!dockerRun(runOpts)) {
            return false;
        }
    }

    console.log();
}
