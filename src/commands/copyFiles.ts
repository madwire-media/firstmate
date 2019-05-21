import { Config } from '../config';
import { a } from '../helpers/cli';
import { getServiceDir, initBranch, maybeTryBranch, resolveBranchName, SigIntHandler } from '../helpers/service';

export function copyFilesCmdReqs(
    config: Config,
    serviceName: string,
    branchName: string,
    alreadyRunBranches: Set<string>,
    params: {[key: string]: any},
    context: any,
): boolean {
    const service = config.services[serviceName];

    const usedBranchName = resolveBranchName(branchName, service.branches);
    const branchBase = service.branches[usedBranchName];

    if (branchBase[params.mode as 'dev' | 'stage' | 'prod'] === undefined) {
        console.error(a`\{lr Cannot run service \{lw ${serviceName}\} on ${''
            }branch \{lg ${usedBranchName}\} in \{c ${params.mode}\} mode\}`);
        maybeTryBranch(service, usedBranchName, params.mode);
        return false;
    }

    return true;
}

export async function copyFilesCmd(
    config: Config,
    serviceName: string,
    branchName: string,
    handlers: SigIntHandler[],
    alreadyRunBranches: Set<string>,
    isAsync: () => void,
    params: {[key: string]: any},
): Promise<undefined | false> {
    const service = config.services[serviceName];

    const serviceFolder = getServiceDir(serviceName);
    const usedBranchName = resolveBranchName(branchName, service.branches);
    const branchBase = service.branches[usedBranchName];
    const branch = branchBase[params.mode as 'dev' | 'stage' | 'prod']!; // handled in reqs function

    const initResult = await initBranch({
        branch, branchName, serviceName, serviceFolder, isAsync, usedBranchName,
        handlers, config, branchType: branchBase.type, alreadyRunBranches, params,
    }, copyFilesCmd, params.mode, false);
    if (initResult === false) {
        return false;
    }

    isAsync();

    console.log();
}
