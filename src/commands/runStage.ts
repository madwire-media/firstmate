import * as fs from 'fs';

import { Config } from '../config';
import {
    a, getServiceDir, initBranch, maybeTryBranch, needsCluster,
    needsCommand, needsNamespace, reqDependencies, resolveBranchName, SigIntHandler, testServiceFiles,
} from '../helpers/cli';
import {
    dockerBuild, dockerPush, dockerRun, DockerRunOptions, helmInstall,
} from '../helpers/commands';
import * as buildContainer from '../serviceTypes/buildContainer/module';
import * as dockerDeployment from '../serviceTypes/dockerDeployment/module';
import * as dockerImage from '../serviceTypes/dockerImage/module';
import * as pureHelm from '../serviceTypes/pureHelm/module';

export function runStageReqs(
    config: Config,
    serviceName: string,
    branchName: string,
    params: string[],
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
        reqsMet = reqDependencies(config, branchName, branch, runStageReqs, context);
    }

    return reqsMet;
}

export function runStage(
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
    const branch = branchBase.stage!; // handled in reqs function

    const initResult = initBranch({
        branch, branchName, serviceName, serviceFolder, isAsync,
        usedBranchName, handlers, config, branchType: branchBase.type,
    }, runStage, 'stage');
    if (initResult === false) {
        return false;
    }

    if (branch instanceof dockerImage.StageBranch) {
        // Docker build
        if (!dockerBuild(serviceFolder, branch.imageName, undefined, branch.dockerArgs)) {
            return false;
        }

        // Docker push
        if (!dockerPush(`${config.project}/${branch.imageName}:stage`, branch.registry)) {
            return false;
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

        if (!helmInstall(serviceFolder, helmContext, `${config.project}-${serviceName}-stage`)) {
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

            if (!dockerBuild(dir, image, 'stage', args)) {
                return false;
            }

            if (!dockerPush(`${image}:stage`, branch.registry)) {
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

        if (!helmInstall(`${serviceFolder}/helm`, helmContext, `${config.project}-${serviceName}-stage`)) {
            return false;
        }
    } else if (branch instanceof buildContainer.StageBranch) {
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
