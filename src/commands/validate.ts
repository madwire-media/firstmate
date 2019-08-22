import { inspect } from 'util';
import { Config } from '../config';
import * as base from '../config/base/branch';
import { branch } from '../config/buildContainer';
import { BranchModeEnum } from '../config/types/common';
import { ConfiguredDependency } from '../config/types/other';
import { a } from '../helpers/cli';
import { loadConfig } from '../helpers/config';
import { getGitBranch } from '../helpers/git';
import { needsCommand, needsFolder, wantsCommand } from '../helpers/require';
import {
    getServiceDir, resolveBranchName, runDependencies, runService,
    SigIntHandler, testServiceDir, testServiceFiles,
} from '../helpers/service';

export async function validate(params: {[arg: string]: any}, service?: string): Promise<boolean> {
    let isOk =
        needsCommand(undefined, 'docker') &&
        needsCommand(undefined, 'helm') &&
        wantsCommand(undefined, 'telepresence');

    const loadedConfig = loadConfig(undefined);
    if (loadedConfig === undefined) {
        // Need to have configuration loaded for anything else to work
        return false;
    }

    const config = loadedConfig.parsed;

    const branchName = getGitBranch(undefined);
    if (branchName === false) {
        // Need to be on a git branch for anything else to work
        return false;
    }
    console.log(a`Detected git branch \{lg ${branchName}\}`);
    console.log();

    const checkedServices = new Set<string>();

    const handler = async (
        config: Config,
        serviceName: string,
        branchName: string,
        handlers: SigIntHandler[],
        alreadyRunBranches: Set<string | ConfiguredDependency>,
        isAsync: () => void,
    ) => {
        if (checkedServices.has(serviceName)) {
            return undefined;
        }

        checkedServices.add(serviceName);

        const serviceFolder = getServiceDir(serviceName);
        if (!testServiceDir(undefined, serviceName)) {
            isOk = false;
        }

        const service = config.services[serviceName];
        const usedBranchName = resolveBranchName(branchName, service.branches);

        if (usedBranchName in service.branches) {
            const branchBase = service.branches[usedBranchName];
            // const branchBaseIter = branchBase as any as {[key: string]: typeof branch.basic | undefined};

            // Check that certain files exist
            if (serviceFolder !== undefined && needsFolder(serviceFolder)) {
                testServiceFiles(serviceName, branchBase.type);
            }

            // Check all dependencies for all environments
            for (const envName of ['dev', 'stage', 'prod'] as (keyof typeof BranchModeEnum)[]) {
                const branch = branchBase[envName];

                if (branch !== undefined) {
                    await runDependencies(config, branchName, branch, [], alreadyRunBranches, isAsync, {}, handler);
                }
            }
        }
    };
    // const fn = runServiceBase(handler, false);

    if (service !== undefined) {
        const result = await runService(handler, () => true, undefined, undefined, params, service, {
            config,
            liveRun: false,
        });

        if (result === false) {
            isOk = false;
        }
    } else {
        for (const serviceName in config.services) {
            if (!checkedServices.has(serviceName)) {
                const result = await runService(handler, () => true, undefined, undefined, params, serviceName, {
                    config,
                    liveRun: false,
                });

                if (result === false) {
                    isOk = false;
                }
            }
        }
    }

    if (isOk) {
        console.log(a`\{g No issues detected\}`);
        return true;
    } else {
        return false;
    }
}
