import * as fs from 'fs';

import { Config } from '../config';
import { tagged } from '../config/types/branch';
import { ConfiguredDependency } from '../config/types/other';
import { a } from '../helpers/cli';
import * as docker from '../helpers/commands/docker';
import * as helm from '../helpers/commands/helm';
import { needsCluster, needsCommand, needsNamespace } from '../helpers/require';
import {
    getServiceDir, initBranch, maybeTryBranch, reqDependencies,
    resolveBranchName, SigIntHandler, testServiceFiles,
} from '../helpers/service';

export function runProdReqs(
    config: Config,
    serviceName: string,
    branchName: string,
    alreadyRunBranches: Set<string | ConfiguredDependency>,
    params: {[arg: string]: any},
    context: any,
): boolean {
    const service = config.services[serviceName];

    const usedBranchName = resolveBranchName(branchName, service.branches);
    const branchBase = service.branches[usedBranchName];

    if (branchBase.prod === undefined) {
        console.error(a`\{lr Cannot run service \{lw ${serviceName}\} on ${''
            }branch \{lg ${usedBranchName}\} in \{c prod\} mode\}`);
        maybeTryBranch(service, usedBranchName, 'prod');
        return false;
    }
    const branch = branchBase.prod;

    if (!branch.allowedActions.includes('run')) {
        console.error(a`\{lr Cannot run service \{lw ${serviceName}\} on ${''
            }branch \{lg ${usedBranchName}\} in \{c prod\} mode\}`);
        console.error(a`\{b run action is disabled on branch/mode\}`);
        return false;
    }

    if (!testServiceFiles(serviceName, branchBase.type)) {
        return false;
    }

    let reqsMet = true;

    if (tagged(branch, 'dockerImage')) {
        reqsMet = needsCommand(context, 'docker');
    } else if (tagged(branch, 'pureHelm')) {
        // Don't check for cluster if helm isn't installed
        reqsMet = needsCommand(context, 'helm') &&
            needsCluster(context, branch.cluster);
    } else if (tagged(branch, 'dockerDeployment')) {
        reqsMet = needsCommand(context, 'docker');

        // Check for helm regardless of if docker is installed, but
        // don't check for cluster if helm isn't installed
        reqsMet = needsCommand(context, 'helm') &&
            needsCluster(context, branch.cluster) &&
            reqsMet;
    } else if (tagged(branch, 'buildContainer')) {
        // N/A
    }

    if (reqsMet) {
        reqsMet = reqDependencies(config, branchName, branch, alreadyRunBranches, runProdReqs, params, context);
    }

    return reqsMet;
}

export async function runProd(
    config: Config,
    serviceName: string,
    branchName: string,
    handlers: SigIntHandler[],
    alreadyRunBranches: Set<string | ConfiguredDependency>,
    isAsync: () => void,
    params: {[arg: string]: any},
    ): Promise<undefined | false> {
    const service = config.services[serviceName];

    const serviceFolder = getServiceDir(serviceName);
    const usedBranchName = resolveBranchName(branchName, service.branches);
    const branchBase = service.branches[usedBranchName];
    const branch = branchBase.prod!; // handled in reqs function

    const initResult = await initBranch({
        branch, branchName, serviceName, serviceFolder, isAsync, usedBranchName,
        handlers, config, branchType: branchBase.type, alreadyRunBranches, params,
    }, runProd, 'prod');
    if (initResult === false) {
        return false;
    }

    if (tagged(branch, 'dockerImage')) {
        // Docker pull
        if (!docker.pull(branch.registry, `${config.project}/${branch.imageName}`, branch.version)) {
            return false;
        }
    } else if (tagged(branch, 'pureHelm')) {
        // Create namespace if it doesn't exist
        if (!needsNamespace(branch.cluster, branch.namespace)) {
            return false;
        }

        // Helm chart run w/ vars
        const helmContext = {
            branch,
            env: 'prod',
        };
        let repo;

        if (!branch.noHelmDeploy) {
            repo = branch.chartmuseum;
        }

        if (!helm.install(
            helmContext,
            branch.releaseName || `${config.project}-${serviceName}`,
            serviceName,
            repo,
        )) {
            return false;
        }
    } else if (tagged(branch, 'dockerDeployment')) {
        const containers = fs.readdirSync(`${serviceFolder}/docker`)
            .filter((dir) => fs.statSync(`${serviceFolder}/docker/${dir}`).isDirectory());
        const containerDirs = containers.map((dir) => `${serviceFolder}/docker/${dir}`);
        const dockerImages: {[container: string]: string} = {};

        // Docker pulls
        for (const index in containers) {
            const dirname = containers[index];
            const prefix = branch.imageNamePrefix || serviceName;
            let image;

            if (branch.noProjectPrefix) {
                image = `${prefix}-${dirname}`;
            } else {
                image = `${config.project}/${prefix}-${dirname}`;
            }

            dockerImages[dirname] = `${image}:${branch.version}`;

            if (!docker.pull(branch.registry, image, branch.version)) {
                return false;
            }
        }

        // Create namespace if it doesn't exist
        if (!needsNamespace(branch.cluster, branch.namespace)) {
            return false;
        }

        // Helm chart run w/ vars
        const helmContext = {
            branch: {...branch, recreatePods: false},
            dockerImages,
            env: 'prod',
        };
        let repo;

        if (!branch.noHelmDeploy) {
            repo = branch.chartmuseum;
        }

        if (!helm.install(
            helmContext,
            branch.releaseName || `${config.project}-${serviceName}`,
            serviceName,
            repo,
        )) {
            return false;
        }
    } else if (tagged(branch, 'buildContainer')) {
        console.log(a`\{ld (not applicable)\}`);
    }

    console.log();
}
