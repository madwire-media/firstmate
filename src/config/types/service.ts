import * as t from 'io-ts';

import { IoContext } from '../../util/io-context';
import { createError, intoFailure, intoSuccess, IoErrors } from '../../util/io-errors';
import { mask } from '../../util/maskable';
import { merge } from '../../util/mergable';
import * as base from '../base/branch';
import { BranchType } from './branch';
import { BranchModeEnum, branchModes } from './common';
import { BranchName, rgxUsedBranchName, UsedBranchName } from './strings';

export interface IService<T extends string, B extends BranchType<any, any, any, T>> {
    type: T;
    branches: {[branchName: string]: t.TypeOf<B>};
}

export class ServiceType<
    TN extends string,
    B extends BranchType<any, any, any, TN>,
> extends t.InterfaceType<
    {
        type: t.LiteralType<TN>,
        branches: t.DictionaryType<t.StringType, B>
    },
    IService<TN, B>
> {
    // tslint:disable-next-line:variable-name
    // public readonly _tag: 'ServiceType' = 'ServiceType';
    constructor(
        name: string,
        is: ServiceType<TN, B>['is'],
        validate: ServiceType<TN, B>['validate'],
        encode: ServiceType<TN, B>['encode'],
        readonly type: TN,
        readonly branch: B,
    ) {
        super(name, is, validate, encode, {
            type: t.literal(type),
            branches: t.dictionary(t.string, branch),
        });
    }
}

type TypeOfPlusInherit<T extends t.Mixed> =
    & t.TypeOf<T>
    & base.env.atoms.InheritFrom;

function resolveBranches<
    BP extends BranchType<any, any, any, any>
>(
    branches: {[key: string]: TypeOfPlusInherit<typeof base.env.comp.allPartial>},
    env: keyof typeof BranchModeEnum,
    c: IoContext,
    {
        partialBranches,
        branchTypePartial,
    }: {
        partialBranches: t.DictionaryType<t.Type<string>, typeof branchTypePartial>,
        branchTypePartial: BP,
    },
) {
    const errors: IoErrors = [];

    // Resolve branch inheritance
    const branchDependents: {
        [dependency: string]: {[dependent: string]: true},
    } = {};
    const branchDependencies: {
        [dependent: string]: {[dependency: string]: number},
    } = {};
    const endpoints: string[] = [];
    const branchMergeTmpls: {
        [branch: string]: {}[],
    } = {};
    const mergedBranches: {
        [branch: string]: {},
    } = {};

    // Index the branch dependencies
    for (const branchName in branches) {
        const branch = branches[branchName];

        if (branch.inheritFrom !== undefined && branch.inheritFrom.length > 0) {
            let {inheritFrom} = branch;

            if (typeof inheritFrom === 'string') {
                inheritFrom = [inheritFrom];
            }

            const deps: typeof branchDependencies[string] = {};

            for (let i = 0; i < inheritFrom.length; i++) {
                const dependency = inheritFrom[i];

                if (!(dependency in branchDependents)) {
                    branchDependents[dependency] = {[branchName]: true};
                } else {
                    branchDependents[dependency][branchName] = true;
                }

                deps[dependency] = i;
            }

            if (Object.keys(deps).length > 0) {
                branchDependencies[branchName] = deps;
            } else {
                endpoints.push(branchName);
            }
        }

        // Don't merge the inheritFrom property
        mergedBranches[branchName] = mask(branch, {inheritFrom: true});
    }

    // Do a recursive merge on the branch objects O(n)
    while (endpoints.length > 0) {
        const endpointName = endpoints.pop()!;
        const endpointDependents = branchDependents[endpointName];

        // Make sure endpoint (inherited branch) exists
        if (!(endpointName in mergedBranches)) {
            for (const dependent in endpointDependents) {
                errors.push(createError(
                    undefined,
                    c
                        .sub('branches', partialBranches)
                        .sub(dependent, branchTypePartial)
                        .sub(env, branchTypePartial[env]),
                    `cannot inherit from nonexistent branch '${endpointName}'`,
                ));
            }

            continue;
        }

        const endpointBranch = mergedBranches[endpointName];

        for (const dependent in endpointDependents) {
            // Grab the dependent's dependencies (including self)
            const depDependencies = branchDependencies[dependent];
            let dependencyLength = Object.keys(depDependencies).length;

            // Initialize the merge template
            if (!(dependent in branchMergeTmpls)) {
                branchMergeTmpls[dependent] = new Array(dependencyLength);
            }

            // Insert self (dependency) into dependent's merge template
            // at correct index
            const dependencyIndex = depDependencies[endpointName];
            branchMergeTmpls[dependent][dependencyIndex] = endpointBranch;

            // Remove self from dependent's dependency list
            delete depDependencies[endpointName];
            dependencyLength--;

            // If dependent has no unresolved dependencies, compute
            // merge for dependent, remove dependent from dependencies
            // map, and add to endpoints list
            if (dependencyLength === 0) {
                const orderedDeps = branchMergeTmpls[dependent].slice().reverse();
                mergedBranches[dependent] = merge(mergedBranches[dependent], orderedDeps);

                delete branchMergeTmpls[dependent];
                delete branchDependencies[dependent];
                endpoints.push(dependent);
            }
        }

        // Delete this dependent from the list
        delete branchDependents[endpointName];
    }

    // Check if there's a loop in the dependency graph
    if (Object.keys(branchDependencies).length > 0) {
        for (const loopingBranch in branchDependencies) {
            const loopDeps = branchDependencies[loopingBranch];
            const loopDepsText = Object.keys(loopDeps).join(', ');

            errors.push(createError(
                mergedBranches[loopingBranch],
                c
                    .sub('branches', partialBranches)
                    .sub(loopingBranch, branchTypePartial)
                    .sub(env, branchTypePartial[env]),
                `inherits from or is part of inheritance loop (one of [${loopDepsText}])`,
            ));
        }
    }

    return {mergedBranches, errors};
}

export function serviceType<
    TN extends string,
    BS extends BranchType<any, any, any, TN>,
    BP extends BranchType<any, any, any, TN>
>(
    branchTypeExact: BS,
    branchTypePartial: BP,
    serviceTypeName: TN,
) {
    const serviceType = t.literal(serviceTypeName);

    const baseBranches = t.dictionary(t.string, base.branch.partial);
    const partialBranches = t.dictionary(BranchName, branchTypePartial);
    const exactBranches = t.dictionary(UsedBranchName, branchTypeExact);

    const service = t.type({
        type: serviceType,
        branches: baseBranches,
    });
    const servicePartial = t.type({
        type: serviceType,
        branches: partialBranches,
    });
    const serviceExact = t.type({
        type: serviceType,
        branches: exactBranches,
    });

    return new ServiceType(
        `Service (${serviceTypeName})`,
        serviceExact.is,
        (m, cr) => {
            const c = IoContext.from(cr);

            // Validate service
            const validServiceBasic = service.validate(m, c);
            if (validServiceBasic.isLeft()) {
                return validServiceBasic as any;
            }

            // And get strictly-typed results
            let {type, branches} = validServiceBasic.value;

            const errors: IoErrors = [];

            // Validate partial branches
            const validServicePartial = servicePartial.validate(m, c);
            if (validServicePartial.isLeft()) {
                errors.push(...validServicePartial.value);
            } else {
                branches = validServicePartial.value.branches;
            }

            const mergedBranches: {
                [branch: string]: {
                    dev?: {},
                    stage?: {},
                    prod?: {},
                    allowedModes: keyof typeof BranchModeEnum,
                },
            } = {};

            for (const env of branchModes) {
                const branchesEnv: {
                    [branch: string]: {},
                } = {};

                for (const branchName in branches) {
                    const branch = branches[branchName];

                    if (branch[env]) {
                        branchesEnv[branchName] = branch[env]!;
                    }
                }

                const {
                    mergedBranches: mergedBranchesEnv,
                    errors: errorsEnv,
                } = resolveBranches(
                    branchesEnv,
                    env,
                    c,
                    {
                        partialBranches,
                        branchTypePartial,
                    },
                );

                for (const branchName in mergedBranchesEnv) {
                    const mergedBranchEnv = mergedBranchesEnv[branchName];

                    if (!(branchName in mergedBranches)) {
                        mergedBranches[branchName] = {
                            allowedModes: (m as any).branches[branchName].allowedModes,
                        };
                    }

                    mergedBranches[branchName][env] = mergedBranchEnv;
                }

                errors.push(...errorsEnv);
            }

            // Filter out the unused branches (/~.+/)
            const usedBranchNames = Object.keys(mergedBranches)
                .filter((b) => rgxUsedBranchName.test(b));
            const usedBranches: {[branch: string]: {}} = {};

            for (const usedBranchName of usedBranchNames) {
                usedBranches[usedBranchName] = mergedBranches[usedBranchName];
            }

            const output = {
                type,
                branches: usedBranches,
            };

            // Do a final exact check on used merged branches
            if (errors.length === 0) {
                const validServiceExact = serviceExact.validate(output, c);
                if (validServiceExact.isLeft()) {
                    errors.push(...validServiceExact.value);
                }
            }

            for (const branchName in output.branches) {
                (output.branches[branchName] as {type: string}).type = type;
            }

            if (errors.length > 0) {
                return intoFailure(errors);
            } else {
                return intoSuccess(output);
            }
        },
        (a) => {
            throw new Error('Cannot be decoded');
        },
        serviceTypeName,
        branchTypeExact,
    );
}
