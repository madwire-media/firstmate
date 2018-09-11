import * as fs from 'fs';

import { Config } from '../config';
import { a } from '../helpers/cli';
import * as docker from '../helpers/commands/docker';
import * as helm from '../helpers/commands/helm';
import { needsCluster, needsCommand, needsNamespace } from '../helpers/require';
import {
    getServiceDir, initBranch, maybeTryBranch, reqDependencies,
    resolveBranchName, SigIntHandler, testServiceFiles,
} from '../helpers/service';
import * as buildContainer from '../serviceTypes/buildContainer/module';
import * as dockerDeployment from '../serviceTypes/dockerDeployment/module';
import * as dockerImage from '../serviceTypes/dockerImage/module';
import * as pureHelm from '../serviceTypes/pureHelm/module';

export function runStageReqs(
    config: Config,
    serviceName: string,
    branchName: string,
    alreadyRunBranches: Set<string>,
    params: {[arg: string]: any},
    context: any,
): boolean {
    const service = config.services[serviceName];

    const usedBranchName = resolveBranchName(branchName, service.branches);
    const branchBase = service.branches[usedBranchName];

    if (branchBase.stage === undefined) {
        console.error(a`\{lr Cannot run service \{lw ${serviceName}\} on ${''
            }branch \{lg ${usedBranchName}\} in \{ stage\} mode\}`);
        maybeTryBranch(service, usedBranchName, 'stage');
        return false;
    }
    const branch = branchBase.stage;

    if (!testServiceFiles(serviceName, branchBase.type)) {
        return false;
    }

    let reqsMet = true;

    if (branch instanceof dockerImage.StageBranch) {
        reqsMet = needsCommand(context, 'docker');
    } else if (branch instanceof pureHelm.StageBranch) {
        // Don't check for cluster if helm isn't installed
        reqsMet = needsCommand(context, 'helm') &&
            needsCluster(context, branch.cluster);
    } else if (branch instanceof dockerDeployment.StageBranch) {
        reqsMet = needsCommand(context, 'docker');

        // Check for helm regardless of if docker is installed, but
        // don't check fro cluster if helm isn't installed
        reqsMet = needsCommand(context, 'helm') &&
            needsCluster(context, branch.cluster) &&
            reqsMet;
    } else if (branch instanceof buildContainer.StageBranch) {
        reqsMet = needsCommand(context, 'docker');
    }

    if (reqsMet) {
        reqsMet = reqDependencies(config, branchName, branch, alreadyRunBranches, runStageReqs, params, context);
    }

    return reqsMet;
}

export async function runStage(
    config: Config,
    serviceName: string,
    branchName: string,
    handlers: SigIntHandler[],
    alreadyRunBranches: Set<string>,
    isAsync: () => void,
    params: {[arg: string]: any},
): Promise<undefined | false> {
    const service = config.services[serviceName];

    const serviceFolder = getServiceDir(serviceName);
    const usedBranchName = resolveBranchName(branchName, service.branches);
    const branchBase = service.branches[usedBranchName];
    const branch = branchBase.stage!; // handled in reqs function

    const initResult = await initBranch({
        branch, branchName, serviceName, serviceFolder, isAsync, usedBranchName,
        handlers, config, branchType: branchBase.type, alreadyRunBranches, params,
    }, runStage, 'stage');
    if (initResult === false) {
        return false;
    }

    if (branch instanceof dockerImage.StageBranch) {
        const image = `${config.project}/${branch.imageName}`;

        // Docker build
        if (!docker.build(serviceFolder, image, undefined, branch.dockerArgs)) {
            return false;
        }

        // Docker push
        if (branch.pushImage) {
            if (!docker.push(`${image}:stage`, branch.registry)) {
                return false;
            }
        }
    } else if (branch instanceof pureHelm.StageBranch) {
        // Create namespace if it doesn't exist
        if (!needsNamespace(branch.cluster, branch.namespace)) {
            return false;
        }

        // Helm chart run w/ vars
        const helmContext = {
            branch,
            env: 'stage',
        };

        if (!helm.install(helmContext, branch.releaseName || `${config.project}-${serviceName}-stage`, serviceName)) {
            return false;
        }
    } else if (branch instanceof dockerDeployment.StageBranch) {
        const containers = fs.readdirSync(`${serviceFolder}/docker`)
            .filter((dir) => fs.statSync(`${serviceFolder}/docker/${dir}`).isDirectory());
        const containerDirs = containers.map((dir) => `${serviceFolder}/docker/${dir}`);
        const dockerImages: {[container: string]: string} = {};

        // Docker Builds and Pushes
        for (const index in containers) {
            const dirname = containers[index];
            const dir = containerDirs[index];
            const prefix = branch.imageNamePrefix || serviceName;
            const image = `${config.project}/${prefix}-${dirname}`;
            let args;

            dockerImages[dirname] = `${image}:stage`;

            if (dirname in branch.containers) {
                args = branch.containers[dirname].dockerArgs;
            }

            if (!docker.build(dir, image, 'stage', args)) {
                return false;
            }

            if (!docker.push(`${image}:stage`, branch.registry)) {
                return false;
            }
        }

        // Create namespace if it doesn't exist
        if (!needsNamespace(branch.cluster, branch.namespace)) {
            return false;
        }

        // Helm chart run w/ vars
        const helmContext = {
            branch,
            dockerImages,
            env: 'stage',
        };

        if (!helm.install(helmContext, branch.releaseName || `${config.project}-${serviceName}-stage`, serviceName)) {
            return false;
        }
    } else if (branch instanceof buildContainer.StageBranch) {
        const image = `fmbuild-${serviceName}`;

        if (!docker.build(serviceFolder, image, undefined, branch.dockerArgs)) {
            return false;
        }

        const runOpts: docker.RunOptions = {
            image,
            name: image,
            rm: true,
            volumes: branch.volumes,
        };

        if (!docker.run(runOpts)) {
            return false;
        }
    }

    console.log();
}
