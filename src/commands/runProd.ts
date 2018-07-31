import * as fs from 'fs';

import { Config } from '../config';
import {
    a, getServiceDir, initBranch, needsCommand, needsNamespace,
    reqDependencies, resolveBranchName, SigIntHandler, testServiceFiles,
} from '../helpers/cli';
import {
    dockerPull, helmInstall,
} from '../helpers/commands';
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
            }branch \{lg ${usedBranchName}\} in prod mode\}`);
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
        reqsMet = needsCommand(context, 'helm');
    } else if (branch instanceof dockerDeployment.ProdBranch) {
        reqsMet =
            needsCommand(context, 'docker') &&
            needsCommand(context, 'helm');
    } else if (branch instanceof buildContainer.ProdBranch) {
        reqsMet = true; // not applicable
    }

    if (reqsMet) {
        reqsMet = reqDependencies(config, branchName, branch, runProdReqs, context);
    }

    return reqsMet;
}

export function runProd(
    config: Config,
    serviceName: string,
    branchName: string,
    handlers: SigIntHandler[],
    isAsync: () => void,
): undefined | false {
    const service = config.services[serviceName];

    const serviceFolder = getServiceDir(serviceName);
    const usedBranchName = resolveBranchName(branchName, service.branches);
    const branchBase = service.branches[usedBranchName];
    const branch = branchBase.prod!; // handled in reqs function

    const initResult = initBranch({
        branch, branchName, serviceName, serviceFolder, isAsync,
        usedBranchName, handlers, config, branchType: branchBase.type,
    }, runProd, 'prod');
    if (initResult === false) {
        return false;
    }

    if (branch instanceof dockerImage.ProdBranch) {
        // Docker pull
        if (!dockerPull(branch.registry, `${config.project}/${branch.imageName}`, branch.version)) {
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

        if (!helmInstall(serviceFolder, helmContext, `${config.project}-${serviceName}`)) {
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

            if (!dockerPull(branch.registry, image, branch.version)) {
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

        if (!helmInstall(`${serviceFolder}/helm`, helmContext, `${config.project}-${serviceName}`)) {
            return false;
        }
    } else if (branch instanceof buildContainer.ProdBranch) {
        console.log(a`\{ld (not applicable)\}`);
    }

    console.log();
}
