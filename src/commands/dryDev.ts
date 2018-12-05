import * as fs from 'fs';

import * as t from 'io-ts';

import { Config } from '../config';
import { a } from '../helpers/cli';
import * as docker from '../helpers/commands/docker';
import * as helm from '../helpers/commands/helm';
import { needsCluster, needsCommand } from '../helpers/require';
import {
    getServiceDir, initBranch, maybeTryBranch, reqDependencies, resolveBranchName,
    SigIntHandler, testServiceFiles,
} from '../helpers/service';
import { tagged } from '../config/types/branch';

export function dryDevReqs(
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

    if (branchBase.dev === undefined) {
        console.error(a`\{lr Cannot (dry) run service \{lw ${serviceName}\} on ${''
            }branch \{lg ${usedBranchName}\} in \{c dev\} mode\}`);
        maybeTryBranch(service, usedBranchName, 'dev');
        return false;
    }
    const branch = branchBase.dev;

    if (!testServiceFiles(serviceName, branchBase.type)) {
        return false;
    }

    let reqsMet = true;

    if (tagged(branch, 'dockerImage')) {
        reqsMet = needsCommand(context, 'docker');
    } else if (tagged(branch, 'pureHelm')) {
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
        reqsMet = needsCommand(context, 'docker');
    }

    if (branch.copyFiles !== undefined) {
        reqsMet = needsCommand(context, 'bindfs') && reqsMet;
    }

    if (reqsMet) {
        reqsMet = reqDependencies(config, branchName, branch, alreadyRunBranches, dryDevReqs, params, context);
    }

    return reqsMet;
}

export async function dryDev(
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
    const branch = branchBase.dev!; // handled in reqs function

    const initResult = await initBranch({
        branch, branchName, serviceName, serviceFolder, isAsync, usedBranchName,
        handlers, config, branchType: branchBase.type, alreadyRunBranches, params,
    }, dryDev, 'dev (dry run)');
    if (initResult === false) {
        return false;
    }

    if (tagged(branch, 'dockerImage')) {
        // Docker build
        if (!docker.build(serviceFolder, `${config.project}/${branch.imageName}`, undefined, branch.dockerArgs)) {
            return false;
        }
    } else if (tagged(branch, 'pureHelm')) {
        // Helm chart dry run w/ vars
        const helmContext = {
            dryrun: true,
            branch,
            env: 'dev',
        };

        if (!helm.install(helmContext, branch.releaseName || `${config.project}-${serviceName}-dev`, serviceName)) {
            return false;
        }
    } else if (tagged(branch, 'dockerDeployment')) {
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

            if (branch.containers && dirname in branch.containers) {
                args = branch.containers[dirname].dockerArgs;
            }

            if (!docker.build(dir, image, 'dev', args)) {
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

        if (!helm.install(helmContext, branch.releaseName || `${config.project}-${serviceName}-dev`, serviceName)) {
            return false;
        }
    } else if (tagged(branch, 'buildContainer')) {
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
