import * as fs from 'fs';

import { Config } from '../config';
import { a } from '../helpers/cli';
import * as docker from '../helpers/commands/docker';
import * as helm from '../helpers/commands/helm';
import { needsCommand, needsHelmPlugin } from '../helpers/require';
import {
    getServiceDir, initBranch, maybeTryBranch, reqDependencies,
    resolveBranchName, SigIntHandler, testServiceFiles,
} from '../helpers/service';
import * as buildContainer from '../serviceTypes/buildContainer/module';
import * as dockerDeployment from '../serviceTypes/dockerDeployment/module';
import * as dockerImage from '../serviceTypes/dockerImage/module';
import * as pureHelm from '../serviceTypes/pureHelm/module';

export function publishProdReqs(
    config: Config,
    serviceName: string,
    branchName: string,
    alreadyRunBranches: Set<string>,
    params: string[],
    context: any,
): boolean {
    const service = config.services[serviceName];

    const usedBranchName = resolveBranchName(branchName, service.branches);
    const branchBase = service.branches[usedBranchName];

    if (branchBase.prod === undefined) {
        console.error(a`\{lr Cannot publish service \{lw ${serviceName}\} on ${''
            }branch \{lg ${usedBranchName}\} in \{c prod\} mode`);
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
        // Don't check for helm plugin if helm isn't installed
        reqsMet = needsCommand(context, 'helm') &&
            needsHelmPlugin(context, 'push', 'https://github.com/chartmuseum/helm-push') && reqsMet;
    } else if (branch instanceof dockerDeployment.ProdBranch) {
        reqsMet = needsCommand(context, 'docker');
    } else if (branch instanceof buildContainer.ProdBranch) {
        reqsMet = needsCommand(context, 'docker');

        // Check for helm regardless of if docker is installed, but
        // don't check for helm plugin if helm isn't installed
        reqsMet = needsCommand(context, 'helm') &&
            needsHelmPlugin(context, 'push', 'https://github.com/chartmuseum/helm-push') && reqsMet;
    }

    if (reqsMet) {
        reqsMet = reqDependencies(config, branchName, branch, alreadyRunBranches, publishProdReqs, context);
    }

    return reqsMet;
}

export async function publishProd(
    config: Config,
    serviceName: string,
    branchName: string,
    handlers: SigIntHandler[],
    alreadyRunBranches: Set<string>,
    isAsync: () => void,
): Promise<undefined | false> {
    const service = config.services[serviceName];

    const serviceFolder = getServiceDir(serviceName);
    const usedBranchName = resolveBranchName(branchName, service.branches);
    const branchBase = service.branches[usedBranchName];
    const branch = branchBase.prod!; // handled in reqs function

    const initResult = await initBranch({
        branch, branchName, serviceName, serviceFolder, isAsync, usedBranchName,
        handlers, config, branchType: branchBase.type, alreadyRunBranches,
    }, publishProd, 'prod');
    if (initResult === false) {
        return false;
    }

    if (branch instanceof dockerImage.ProdBranch) {
        const image = `${config.project}/${branch.imageName}`;

        // Docker build
        if (!docker.build(serviceFolder, image, undefined, branch.dockerArgs)) {
            return false;
        }

        // Docker push
        if (!docker.push(`${image}:latest`, branch.registry)) {
            return false;
        }
        if (!docker.push(`${image}:${branch.version}`, branch.registry)) {
            return false;
        }
    } else if (branch instanceof pureHelm.ProdBranch) {
        // Helm chart publish
        const helmContext = {
            branch,
            env: 'prod',
        };

        if (!helm.push(helmContext, serviceName)) {
            return false;
        }
    } else if (branch instanceof dockerDeployment.ProdBranch) {
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

            dockerImages[dirname] = `${image}:${branch.version}`;

            if (dirname in branch.containers) {
                args = branch.containers[dirname].dockerArgs;
            }

            if (!docker.build(dir, image, branch.version, args)) {
                return false;
            }

            if (!docker.push(`${image}:${branch.version}`, branch.registry)) {
                return false;
            }
        }

        // Helm chart publish
        const helmContext = {
            branch,
            env: 'prod',
        };

        if (!helm.push(helmContext, serviceName)) {
            return false;
        }
    } else if (branch instanceof buildContainer.ProdBranch) {
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
