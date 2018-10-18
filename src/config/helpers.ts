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

interface Obj {[key: string]: any; }

export function mergeValues(source: any, dest: any): any {
    if (source === null) {
        return undefined;
    } else if (typeof source === 'object' && !(source instanceof Array)) {
        dest = dest || {};
        return mergeObjects(source, dest);
    } else if (source === undefined) {
        return dest;
    } else {
        return source;
    }
}

export function mergeObjects(from: Obj, onto: Obj): Obj {
    onto = {...onto};

    for (const key in from) {
        const value = from[key];

        if (value === null) {
            if (key in onto) {
                delete onto[key];
            }
        } else if (typeof value === 'object' && !(value instanceof Array)) {
            onto[key] = mergeObjects(from[key], onto[key] || {});
        } else if (value === undefined) {
            // Leave onto as it was
        } else {
            onto[key] = from[key];
        }
    }

    return onto;
}

function normInheritFrom(inheritFrom: string | string[] | undefined): string[] | undefined {
    if (typeof inheritFrom === 'string') {
        return [inheritFrom];
    } else if (inheritFrom instanceof Array) {
        return inheritFrom.slice();
    } else {
        return undefined;
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

    const branchStack: BranchNode[] = [{
        name: branchName,
        inheritFrom: normInheritFrom(branches[branchName].inheritFrom),
        branch: {...branches[branchName]}, // not copied here so that we can recover the object later using `branch`
    }];

    while (true) {
        const top = branchStack[branchStack.length - 1];

        // We reached the end of current inheritFrom array, pop from stack and merge with previous
        if (!top.inheritFrom || top.inheritFrom.length === 0) {
            const branch = branchStack.pop()!;

            if (branchStack.length === 0) {
                return branch.branch;
            }

            const newTop = branchStack[branchStack.length - 1];
            newTop.branch = mergeObjects(newTop.branch, top.branch);
            continue;
        }

        // Otherwise, there is another object to inherit from
        const nextInherit = top.inheritFrom.pop()!;

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
                `recursive inheritence to branch '${nextInherit}'`);
        }

        // Add new branch onto stack
        const nextBranch = branches[nextInherit];
        branchStack.push({
            name: nextInherit,
            inheritFrom: normInheritFrom(nextBranch.inheritFrom),
            branch: nextBranch,
        });
    }
}

export function parseBaseAnyBranch<T extends BranchBase>(context: ConfigContext,
                                                         branch: T | undefined,
                                                         rawBranch: ConfigBranchBase | undefined,
): T | undefined {
    if (branch !== undefined) {
        branch.copyFiles = mergeValues(context.copyFiles, branch.copyFiles);
        branch.dependsOn = mergeValues(context.dependsOn, branch.dependsOn);

        if (rawBranch !== undefined) {
            branch.copyFiles = mergeValues(rawBranch.copyFiles, branch.copyFiles);
            branch.dependsOn = mergeValues(rawBranch.dependsOn, branch.dependsOn);
        }

        return branch;
    }
}
