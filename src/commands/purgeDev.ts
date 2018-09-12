import { Config } from '../config';
import { a } from '../helpers/cli';
import * as helm from '../helpers/commands/helm';
import { needsCluster, needsCommand } from '../helpers/require';
import {
    getServiceDir, initBranch, maybeTryBranch,
    resolveBranchName, SigIntHandler,
} from '../helpers/service';
import * as buildContainer from '../serviceTypes/buildContainer/module';
import * as dockerDeployment from '../serviceTypes/dockerDeployment/module';
import * as dockerImage from '../serviceTypes/dockerImage/module';
import * as pureHelm from '../serviceTypes/pureHelm/module';

export function purgeDevReqs(
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
        console.error(a`\{lr Cannot purge service \{lw ${serviceName}\} on ${''
            }branch \{lg ${usedBranchName}\} in \{c dev\} mode\}`);
        maybeTryBranch(service, usedBranchName, 'dev');
        return false;
    }
    const branch = branchBase.dev;

    // Don't need to test service files, just deleteing already deployed code by name

    let reqsMet = true;

    if ((branch instanceof dockerImage.DevBranch) || (branch instanceof buildContainer.DevBranch)) {
        // N/A
    } else if ((branch instanceof pureHelm.DevBranch) || (branch instanceof pureHelm.DevBranch)) {
        // Don't check for cluster if helm isn't installed
        reqsMet = needsCommand(context, 'helm') &&
            needsCluster(context, branch.cluster);
    }

    // Not running dependencies, have to be deleted manually

    return reqsMet;
}

export async function purgeDev(
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
    }, purgeDev, 'dev', false);
    if (initResult === false) {
        return false;
    }

    if ((branch instanceof dockerImage.DevBranch) || (branch instanceof buildContainer.DevBranch)) {
        console.log(a`\{ld (not applicable)\}`);
    } else if ((branch instanceof dockerDeployment.DevBranch) || (branch instanceof pureHelm.DevBranch)) {
        // Helm chart purge
        const helmContext = {
            branch,
            env: 'dev',
        };

        if (!helm.del(
            helmContext,
            branch.releaseName || `${config.project}-${serviceName}-dev`,
            true,
        )) {
            return false;
        }
    }

    console.log();
}
