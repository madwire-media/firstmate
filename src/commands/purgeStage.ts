import { Config } from '../config';
import { a, question } from '../helpers/cli';
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

export function purgeStageReqs(
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
        console.error(a`\{lr Cannot purge service \{lw ${serviceName}\} on ${''
            }branch \{lg ${usedBranchName}\} in \{ stage\} mode\}`);
        maybeTryBranch(service, usedBranchName, 'stage');
        return false;
    }
    const branch = branchBase.stage;

    // Don't need to test service files, just deleteing already deployed code by name

    let reqsMet = true;

    if ((branch instanceof dockerImage.StageBranch) || (branch instanceof buildContainer.StageBranch)) {
        // N/A
    } else if ((branch instanceof dockerDeployment.StageBranch) || (branch instanceof pureHelm.StageBranch)) {
        // Don't check for cluster if helm isn't installed
        reqsMet = needsCommand(context, 'helm') &&
            needsCluster(context, branch.cluster);
    }

    // Not running dependencies, have to be deleted manually

    return reqsMet;
}

export async function purgeStage(
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
    }, purgeStage, 'stage', false);
    if (initResult === false) {
        return false;
    }

    if ((branch instanceof dockerImage.StageBranch) || (branch instanceof buildContainer.StageBranch)) {
        console.log(a`\{ld (not applicable)\}`);
    } else if ((branch instanceof pureHelm.StageBranch) || (branch instanceof pureHelm.StageBranch)) {
        // Confirm deletion
        while (true) {
            let answer = await question(
                a`\{ly Are you sure you want to delete the service \{lw ${serviceName}\}?\} (yes/no)`,
            );

            if (answer === undefined) {
                continue;
            }
            answer = answer.trim();

            if (answer === 'yes') {
                break;
            } else if (answer === 'no') {
                console.log();
                return;
            }

            console.log(a`Please type \{g "yes"\} or \{g "no"\}`);
        }

        // Helm chart purge
        const helmContext = {
            branch,
            env: 'stage',
        };

        if (!helm.del(
            helmContext,
            branch.releaseName || `${config.project}-${serviceName}`,
            true,
        )) {
            return false;
        }
    }

    console.log();
}
