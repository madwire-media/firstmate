import { keys as keysOf } from 'ts-transformer-keys';

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

function mergeObject(source: {[key: string]: any}, dest: {[key: string]: any}) {
    for (const key in source) {
        const value = source[key];

        if (typeof value === 'object' && !(value instanceof Array)) {
            dest[key] = dest[key] || {};
            mergeObject(source[key], dest[key]);
        } else if (value === undefined || value === null) {
            if (key in dest) {
                delete dest[key];
            }
        } else {
            dest[key] = source[key];
        }
    }
}

export function resolveBranch(context: ConfigContext,
                              branches: {[branchName: string]: ConfigBranch},
                              branchName: string,
): ConfigBranch {
    interface BranchNode {
        name: string;
        inheritFrom?: string[];
        branch: ConfigBranch;
    }

    const branch = {...branches[branchName]};
    const branchStack: BranchNode[] = [{
        name: branchName,
        inheritFrom: branch.inheritFrom ? branch.inheritFrom.slice() : undefined,
        branch, // not copied here so that we can recover the object later using `branch`
    }];

    const branchKeys = keysOf<ConfigBranch>();

    while (branchStack.length > 0) {
        const top = branchStack[branchStack.length - 1];

        // We reached the end of current inheritFrom array, pop from stack and merge with previous
        if (!top.inheritFrom || top.inheritFrom.length === 0) {
            branchStack.pop();
            mergeObject(top.branch, branchStack[branchStack.length - 1].branch);
            continue;
        }

        // Otherwise, there is another object to inherit from
        const nextInherit = top.inheritFrom.shift()!;

        // Check to make sure branch exists
        if (!(nextInherit in branches)) {
            throw makeError({...context, branchName},
                `cannot inherit from nonexistent branch '${nextInherit}'`);
        }

        // Check to make sure inheritance isn't recursive
        let recursive = false;
        for (const branch of branchStack) {
            if (branch.name === nextInherit) {
                recursive = true;
                break;
            }
        }

        if (recursive) {
            throw makeError({...context, branchName},
                `recursive inheritence to branch '${nextInherit}`);
        }

        // Add new branch onto stack
        const nextBranch = branches[nextInherit];
        branchStack.push({
            name: nextInherit,
            inheritFrom: nextBranch.inheritFrom ? nextBranch.inheritFrom.slice() : undefined,
            branch: nextBranch,
        });
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
