import * as t from 'io-ts';

import { BranchType, typeName } from './branch';
import { ParsingContext } from './parsingContext';
import { IService } from './service';
import { Left, Right } from 'fp-ts/lib/Either';
import { defaultContents } from '../../util/defaultable';

type DefaultFunc<T> = (input: T, context: ParsingContext) => T;

export interface Defaults<
    I extends BranchType<any, any, any, any>,
    O extends BranchType<any, any, any, any>,
> {
    dev: DefaultFunc<NonNullable<t.TypeOf<I>['dev']>>;
    devType: O['dev'];

    stage: DefaultFunc<NonNullable<t.TypeOf<I>['stage']>>;
    stageType: O['stage'];

    prod: DefaultFunc<NonNullable<t.TypeOf<I>['prod']>>;
    prodType: O['prod'];
}

export interface PartialContext {
    project: string;
    service: string;

    chartmuseum?: string;
    registry?: string;
}

export function defaultsFrom<
    I extends BranchType<any, any, any, any>,
    O extends BranchType<any, any, any, any>
>(
    o: O,
    dev: DefaultFunc<NonNullable<t.TypeOf<I>['dev']>>,
    stage: DefaultFunc<NonNullable<t.TypeOf<I>['stage']>>,
    prod: DefaultFunc<NonNullable<t.TypeOf<I>['prod']>>,
): Defaults<I, O> {
    return {
        dev,
        devType: o.dev,

        stage,
        stageType: o.stage,

        prod,
        prodType: o.prod,
    };
}

export function applyDefaults<
    TN extends string,
    D extends t.Type<any>, S extends t.Type<any>, P extends t.Type<any>,
    DS extends t.Type<any>, SS extends t.Type<any>, PS extends t.Type<any>,
    I extends BranchType<D, S, P, TN>,
    O extends BranchType<DS, SS, PS, TN>,
    DF extends Defaults<I, O>,
    SV extends IService<TN, I>
>(
    defaults: DF,
    service: SV,
    context: PartialContext,
    tContext: t.Context
): t.Validation<IService<TN, O>> {
    const strictBranches: {
        [branchName: string]: t.TypeOf<O>
    } = {};
    const errors: t.Errors = [];

    for (const branchName in service.branches) {
        const branch = service.branches[branchName];

        let dev: t.TypeOf<O['dev']>;
        if (branch.dev !== undefined) {
            const devDefault = defaults.dev(
                branch.dev,
                {
                    branch: branchName,
                    env: 'dev',
                    ...context
                }
            );

            const devValid = defaults.devType.validate(devDefault, tContext); // TODO: Fix the context here
            if (devValid.isLeft()) {
                errors.push(...devValid.value);
            } else {
                dev = devValid.value;
            }
        }

        let stage: t.TypeOf<O['stage']>;
        if (branch.stage !== undefined) {
            const stageDefault = defaults.stage(
                branch.stage,
                {
                    branch: branchName,
                    env: 'stage',
                    ...context
                }
            );

            const stageValid = defaults.stageType.validate(stageDefault, tContext); // TODO: Fix the context here
            if (stageValid.isLeft()) {
                errors.push(...stageValid.value);
            } else {
                stage = stageValid.value;
            }
        }

        let prod: t.TypeOf<O['prod']>;
        if (branch.prod !== undefined) {
            const prodDefault = defaults.prod(
                branch.prod,
                {
                    branch: branchName,
                    env: 'prod',
                    ...context
                }
            );

            const prodValid = defaults.prodType.validate(prodDefault, tContext); // TODO: Fix the context here
            if (prodValid.isLeft()) {
                errors.push(...prodValid.value);
            } else {
                prod = prodValid.value;
            }
        }

        if (errors.length === 0) {
            const thisBranch: O['_A'] = {
                type: branch.type,
            };

            if (dev) {
                thisBranch.dev = dev;
                console.log(dev[typeName]);
            }
            if (stage) {
                thisBranch.stage = stage;
                console.log(stage[typeName]);
            }
            if (prod) {
                thisBranch.prod = prod;
                console.log(prod[typeName]);
            }

            console.log(thisBranch);

            strictBranches[branchName] = thisBranch;
        }
    }

    if (errors.length > 0) {
        return new Left(errors);
    } else {
        return new Right(
            {
                type: service.type,
                branches: strictBranches,
            }
        );
    }
}
