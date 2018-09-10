import { BranchBase } from '../serviceTypes/base/branch';
import { ConfigBranch, ConfigBranchBase, ConfigContext } from './types';

export function makeError(context: ConfigContext, msg: string, env?: string) {
    if (context.serviceName !== undefined) {
        if (context.branchName !== undefined) {
            if (env !== undefined) {
                return new Error(`${msg} on ${env} branch '${context.branchName}' of service '${context.serviceName}'`);
            } else {
                return new Error(`${msg} on branch '${context.branchName}' of service '${context.serviceName}'`);
            }
        } else {
            return new Error(`${msg} on service '${context.serviceName}`);
        }
    } else {
        return new Error(`${msg} on root config object`);
    }
}

export function resolveBranch(context: ConfigContext,
                              branches: {[branchName: string]: ConfigBranch},
                              branchName: string,
): ConfigBranch {
    let branch = branches[branchName];
    const travelledBranches: string[] = [];

    while (branch.inheritFrom !== undefined) {
        if (travelledBranches.includes(branch.inheritFrom)) {
            throw makeError({...context, branchName},
                `recursive inheritence to branch '${branch.inheritFrom}'`);
        }
        if (!(branch.inheritFrom in branches)) {
            throw makeError({...context, branchName},
                `cannot inherit from nonexistent branch '${branch.inheritFrom}'`);
        }

        travelledBranches.push(branchName);
        branchName = branch.inheritFrom;
        branch = branches[branchName];
    }

    for (const branchName of travelledBranches) {
        branch = {...branch, ...branches[branchName]};
    }

    return branch;
}

export function parseBaseAnyBranch<T extends BranchBase>(context: ConfigContext,
                                                         branch: T | undefined,
                                                         rawBranch: ConfigBranchBase | undefined,
): T | undefined {
    if (branch !== undefined) {
        branch.copyFiles = context.copyFiles;
        branch.dependsOn = context.dependsOn;

        if (rawBranch !== undefined) {
            branch.copyFiles = rawBranch.copyFiles || branch.copyFiles;
            branch.dependsOn = rawBranch.dependsOn || branch.dependsOn;
        }

        return branch;
    }
}
