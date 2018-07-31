import * as fs from 'fs';

import { Config } from '../config';
import {
    a, getServiceDir, initBranch, needsCommand, reqDependencies,
    resolveBranchName, runDependencies, SigIntHandler, testServiceFiles,
} from '../helpers/cli';
import {
    dockerBuild, dockerRun, DockerRunOptions, helmInstall,
} from '../helpers/commands';
import * as buildContainer from '../serviceTypes/buildContainer/module';
import * as dockerDeployment from '../serviceTypes/dockerDeployment/module';
import * as dockerImage from '../serviceTypes/dockerImage/module';
import * as pureHelm from '../serviceTypes/pureHelm/module';

export function dryDevReqs(
    config: Config,
    serviceName: string,
    branchName: string,
    params: string[],
    context: any,
): boolean {
    const service = config.services[serviceName];

    const usedBranchName = resolveBranchName(branchName, service.branches);
    const branchBase = service.branches[usedBranchName];

    if (branchBase.dev === undefined) {
        console.error(a`\{lr Cannot (dry) run service \{lw ${serviceName}\} on ${''
            }branch \{lg ${usedBranchName}\} in dev mode\}`);
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
        reqsMet = needsCommand(context, 'helm');
    } else if (branch instanceof dockerDeployment.DevBranch) {
        reqsMet = needsCommand(context, 'docker');
        reqsMet = needsCommand(context, 'helm') && reqsMet;
    } else if (branch instanceof buildContainer.DevBranch) {
        reqsMet = needsCommand(context, 'docker');
    }

    if (branch.copyFiles !== undefined) {
        reqsMet = needsCommand(context, 'bindfs') && reqsMet;
    }

    if (reqsMet) {
        reqsMet = reqDependencies(config, branchName, branch, dryDevReqs, context);
    }

    return reqsMet;
}

export function dryDev(
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
    const branch = branchBase.dev!; // handled in reqs function

    const initResult = initBranch({
        branch, branchName, serviceName, serviceFolder, isAsync,
        usedBranchName, handlers, config, branchType: branchBase.type,
    }, dryDev, 'dev (dry run)');
    if (initResult === false) {
        return false;
    }

    if (branch instanceof dockerImage.DevBranch) {
        // Docker build
        if (!dockerBuild(serviceFolder, `${config.project}/${branch.imageName}`, undefined, branch.dockerArgs)) {
            return false;
        }
    } else if (branch instanceof pureHelm.DevBranch) {
        // Helm chart dry run w/ vars
        const helmContext = {
            dryrun: true,
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

        // Docker Builds
        for (const index in containers) {
            const dirname = containers[index];
            const dir = containerDirs[index];
            const prefix = branch.imageNamePrefix || serviceName;
            const image = `${config.project}/${prefix}-${dirname}`;
            let args;

            dockerImages[dirname] = `${branch.registry}/${image}:dev`;

            if (dirname in branch.containers) {
                args = branch.containers[dirname].dockerArgs;
            }

            if (!dockerBuild(dir, image, 'dev', args)) {
                return false;
            }
        }

        // Helm chart dry run w/ vars
        const helmContext = {
            dryrun: true,
            branch,
            dockerImages,
            env: 'dev',
        };

        if (!helmInstall(`${serviceFolder}/helm`, helmContext, `${config.project}-${serviceName}-dev`)) {
            return false;
        }
    } else if (branch instanceof buildContainer.DevBranch) {
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
