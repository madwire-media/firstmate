import * as fs from 'fs';

import { Config } from '../config';
import {
    a, getServiceDir, initBranch, needsCommand, reqDependencies,
    resolveBranchName, SigIntHandler, testServiceFiles,
} from '../helpers/cli';
import {
    dockerBuild, dockerPush, dockerRun, DockerRunOptions,
} from '../helpers/commands';
import * as buildContainer from '../serviceTypes/buildContainer/module';
import * as dockerDeployment from '../serviceTypes/dockerDeployment/module';
import * as dockerImage from '../serviceTypes/dockerImage/module';
import * as pureHelm from '../serviceTypes/pureHelm/module';

export function publishProdReqs(
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
        console.error(a`\{lr Cannot publish service \{lw ${serviceName}\} on ${''
            }branch \{lg ${usedBranchName}\} in prod mode`);
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
        reqsMet = true; // not applicable
    } else if (branch instanceof dockerDeployment.ProdBranch) {
        reqsMet = needsCommand(context, 'docker');
    } else if (branch instanceof buildContainer.ProdBranch) {
        reqsMet = needsCommand(context, 'docker');
    }

    if (reqsMet) {
        reqsMet = reqDependencies(config, branchName, branch, publishProdReqs, context);
    }

    return reqsMet;
}

export function publishProd(
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
    }, publishProd, 'prod');
    if (initResult === false) {
        return false;
    }

    if (branch instanceof dockerImage.ProdBranch) {
        const image = `${config.project}/${branch.imageName}`;

        // Docker build
        if (!dockerBuild(serviceFolder, image, undefined, branch.dockerArgs)) {
            return false;
        }

        // Docker push
        if (!dockerPush(`${image}:latest`, branch.registry)) {
            return false;
        }
        if (!dockerPush(`${image}:${branch.version}`, branch.registry)) {
            return false;
        }
    } else if (branch instanceof pureHelm.ProdBranch) {
        console.log(a`\{ld (not applicable)\}`);
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

            if (!dockerBuild(dir, image, branch.version, args)) {
                return false;
            }

            if (!dockerPush(`${image}:${branch.version}`, branch.registry)) {
                return false;
            }
        }
    } else if (branch instanceof buildContainer.ProdBranch) {
        const image = `fmbuild-${serviceName}`;

        if (!dockerBuild(serviceFolder, image, undefined, branch.dockerArgs)) {
            return false;
        }

        const runOpts: DockerRunOptions = {
            image,
            name: image,
            rm: true,
            volumes: branch.volumes,
            canMount: true,
        };

        runOpts.volumes![`${serviceFolder}/output`] = '/output';

        if (!dockerRun(runOpts)) {
            return false;
        }
    }

    console.log();
}
