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

export function purgeProdReqs(
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

    if (branchBase.prod === undefined) {
        console.error(a`\{lr Cannot purge service \{lw ${serviceName}\} on ${''
            }branch \{lg ${usedBranchName}\} in \{ prod\} mode\}`);
        maybeTryBranch(service, usedBranchName, 'prod');
        return false;
    }
    const branch = branchBase.prod;

    // Don't need to test service files, just deleteing already deployed code by name

    let reqsMet = true;

    if ((branch instanceof dockerImage.ProdBranch) || (branch instanceof buildContainer.ProdBranch)) {
        // N/A
    } else if ((branch instanceof dockerDeployment.ProdBranch) || (branch instanceof pureHelm.ProdBranch)) {
        // Don't check for cluster if helm isn't installed
        reqsMet = needsCommand(context, 'helm') &&
            needsCluster(context, branch.cluster);
    }

    // Not running dependencies, have to be deleted manually

    return reqsMet;
}

export async function purgeProd(
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
    const branch = branchBase.prod!; // handled in reqs function

    const initResult = await initBranch({
        branch, branchName, serviceName, serviceFolder, isAsync, usedBranchName,
        handlers, config, branchType: branchBase.type, alreadyRunBranches, params,
    }, purgeProd, 'prod', false);
    if (initResult === false) {
        return false;
    }

    if ((branch instanceof dockerImage.ProdBranch) || (branch instanceof buildContainer.ProdBranch)) {
        console.log(a`\{ld (not applicable)\}`);
    } else if ((branch instanceof pureHelm.ProdBranch) || (branch instanceof pureHelm.ProdBranch)) {
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
        // REALLY confirm deletion
        while (true) {
            let answer = await question(
                a`\{y,b Are you REALLY sure you want to delete this service?\} (type the service name): `,
            );

            if (answer === undefined) {
                continue;
            }
            answer = answer.trim();

            if (answer === serviceName) {
                break;
            } else {
                console.log();
                return;
            }
        }

        // Helm chart purge
        const helmContext = {
            branch,
            env: 'prod',
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
