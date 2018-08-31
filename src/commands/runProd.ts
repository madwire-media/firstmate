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

export function runProdReqs(
    config: Config,
    serviceName: string,
    branchName: string,
    params: string[],
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

    if (!testServiceFiles(serviceName, branchBase.type)) {
        return false;
    }

    let reqsMet = true;

    if (branch instanceof dockerImage.ProdBranch) {
        reqsMet = needsCommand(context, 'docker');
    } else if (branch instanceof pureHelm.ProdBranch) {
        // Don't check for cluster if helm isn't installed
        reqsMet = needsCommand(context, 'helm') &&
            needsCluster(context, branch.cluster);
    } else if (branch instanceof dockerDeployment.ProdBranch) {
        reqsMet = needsCommand(context, 'docker');

        // Check for helm regardless of if docker is installed, but
        // don't check for cluster if helm isn't installed
        reqsMet = needsCommand(context, 'helm') &&
            needsCluster(context, branch.cluster) &&
            reqsMet;
    } else if (branch instanceof buildContainer.ProdBranch) {
        reqsMet = true; // not applicable
    }

    if (reqsMet) {
        reqsMet = reqDependencies(config, branchName, branch, runProdReqs, context);
    }

    return reqsMet;
}

export async function runProd(
    config: Config,
    serviceName: string,
    branchName: string,
    handlers: SigIntHandler[],
    isAsync: () => void,
): Promise<undefined | false> {
    const service = config.services[serviceName];

    const serviceFolder = getServiceDir(serviceName);
    const usedBranchName = resolveBranchName(branchName, service.branches);
    const branchBase = service.branches[usedBranchName];
    const branch = branchBase.prod!; // handled in reqs function

    const initResult = await initBranch({
        branch, branchName, serviceName, serviceFolder, isAsync,
        usedBranchName, handlers, config, branchType: branchBase.type,
    }, runProd, 'prod');
    if (initResult === false) {
        return false;
    }

    if (branch instanceof dockerImage.ProdBranch) {
        // Docker pull
        if (!docker.pull(branch.registry, `${config.project}/${branch.imageName}`, branch.version)) {
            return false;
        }
    } else if (branch instanceof pureHelm.ProdBranch) {
        // Create namespace if it doesn't exist
        if (!needsNamespace(branch.cluster, branch.namespace)) {
            return false;
        }

        // Helm chart run w/ vars
        const helmContext = {
            branch,
            env: 'prod',
        };

        if (!helm.install(serviceFolder, helmContext, `${config.project}-${serviceName}`)) {
            return false;
        }
    } else if (branch instanceof dockerDeployment.ProdBranch) {
        const containers = fs.readdirSync(`${serviceFolder}/docker`)
            .filter((dir) => fs.statSync(`${serviceFolder}/docker/${dir}`).isDirectory());
        const containerDirs = containers.map((dir) => `${serviceFolder}/docker/${dir}`);
        const dockerImages: {[container: string]: string} = {};

        // Docker pulls
        for (const index in containers) {
            const dirname = containers[index];
            const prefix = branch.imageNamePrefix || serviceName;
            const image = `${config.project}/${prefix}-${dirname}`;

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
            branch,
            dockerImages,
            env: 'prod',
        };

        if (!helm.install(`${serviceFolder}/helm`, helmContext, `${config.project}-${serviceName}`)) {
            return false;
        }
    } else if (branch instanceof buildContainer.ProdBranch) {
        console.log(a`\{ld (not applicable)\}`);
    }

    console.log();
}
