import { Config } from '../config';
import { tagged } from '../config/types/branch';
import { ConfiguredDependency } from '../config/types/other';
import { a, question } from '../helpers/cli';
import * as helm from '../helpers/commands/helm';
import { needsCluster, needsCommand } from '../helpers/require';
import {
    getDependencies, getServiceDir, initBranch,
    maybeTryBranch, resolveBranchName, SigIntHandler,
} from '../helpers/service';

export function purgeStageReqs(
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

    if (branchBase.stage === undefined) {
        console.error(a`\{lr Cannot purge service \{lw ${serviceName}\} on ${''
            }branch \{lg ${usedBranchName}\} in \{c stage\} mode\}`);
        maybeTryBranch(service, usedBranchName, 'stage');
        return false;
    }
    const branch = branchBase.stage;

    if (!branch.allowedActions.includes('purge')) {
        console.error(a`\{lr Cannot purge service \{lw ${serviceName}\} on ${''
            }branch \{lg ${usedBranchName}\} in \{c stage\} mode\}`);
        console.error(a`\{b purge action is disabled on branch/mode\}`);
        return false;
    }

    // Don't need to test service files, just deleteing already deployed code by name

    let reqsMet = true;

    if (tagged(branch, 'dockerImage') || tagged(branch, 'buildContainer')) {
        // N/A
    } else if (tagged(branch, 'dockerDeployment') || tagged(branch, 'pureHelm')) {
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
    alreadyRunBranches: Set<string | ConfiguredDependency>,
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

    if (tagged(branch, 'dockerImage') || tagged(branch, 'buildContainer')) {
        console.log(a`\{ld (not applicable)\}`);
    } else if (tagged(branch, 'dockerDeployment') || tagged(branch, 'pureHelm')) {
        // Confirm deletion
        while (true) {
            let answer = await question(
                a`\{ly Are you sure you want to delete the service \{lw ${serviceName}\}?\} (yes/no): `,
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
            branch.releaseName || `${config.project}-${serviceName}-stage`,
            true,
        )) {
            return false;
        }
    }

    const deps = getDependencies(config, 'dev', branchName, serviceName, ['dockerDeployment', 'pureHelm']);

    if (deps.length > 0) {
        console.log();
        console.log(a`\{lw,u Reminder\}: You need to run \{b fm purge stage [service]\} for all of these too:`);

        for (const dep of deps) {
            console.log(a`  \{c ${dep}\}`);
        }
    }

    console.log();
}
