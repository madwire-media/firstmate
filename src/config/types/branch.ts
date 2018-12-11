import * as t from 'io-ts';
import { IoContext } from '../../util/io-context';
import { intoFailure, intoSuccess, IoErrors } from '../../util/io-errors';
import { AllowedModes } from './common';

import { setDefault } from '../../util/defaultable';
import { mask } from '../../util/maskable';
import { merge } from '../../util/mergable';

export const typeName = Symbol('branchTypeName');

type Tagged<T extends {}, TN extends string> = T & {[typeName]: TN};

export function tagged<
    TN extends string,
    T extends {},
>(type: Tagged<T, string>, name: TN): type is Tagged<T, TN> {
    return type[typeName] === name;
}

export interface IBranch<TN extends string, D, S, P> {
    type: TN;
    dev?: Tagged<D, TN>;
    stage?: Tagged<S, TN>;
    prod?: Tagged<P, TN>;
}

export class BranchType<
    D extends t.Mixed,
    S extends t.Mixed,
    P extends t.Mixed,
    T extends string
> extends t.Type<
    IBranch<
        T,
        t.TypeOf<D>,
        t.TypeOf<S>,
        t.TypeOf<P>
    >,
    any
> {
    // tslint:disable-next-line:variable-name
    public readonly _tag: 'BranchType' = 'BranchType';
    constructor(
        name: string,
        is: BranchType<D, S, P, T>['is'],
        validate: BranchType<D, S, P, T>['validate'],
        encode: BranchType<D, S, P, T>['encode'],
        readonly dev: D,
        readonly stage: S,
        readonly prod: P,
        readonly type: T,
    ) {
        super(name, is, validate, encode);
    }
}

// When using, call once to create partial branch (used during initial parsing),
// and another time for strict branch (used after inheriting is complete)
export function branchType<
    DT extends t.Type<any, any>,
    ST extends t.Type<any, any>,
    PT extends t.Type<any, any>,
    TN extends string
>(
    devType: DT,
    stageType: ST,
    prodType: PT,
    type: TN,
    name: string,
) {
    type D = DT extends t.Type<infer A> ? A : never;
    type S = ST extends t.Type<infer A> ? A : never;
    type P = PT extends t.Type<infer A> ? A : never;

    const branch = t.intersection([
        t.type({
            type: type === '' ? t.string : t.literal(type),
        }),
        t.partial({
            dev: devType,
            stage: stageType,
            prod: prodType,
        }),
    ]);

    return new BranchType(
        name,
        branch.is,
        (m, cr): t.Validation<IBranch<TN, D, S, P>> => {
            const c = IoContext.from(cr);

            const validDict = t.Dictionary.validate(m, c);
            if (validDict.isLeft()) {
                return validDict as any;
            }

            const errors: IoErrors = [];

            const dict = validDict.value;
            let allowedModes: ('dev' | 'stage' | 'prod')[];

            if ('allowedModes' in dict) {
                const validModes = AllowedModes.validate(
                    dict.allowedModes,
                    c.sub('allowedModes', AllowedModes),
                );
                if (validModes.isLeft()) {
                    errors.push(...validModes.value);
                    allowedModes = ['dev', 'stage', 'prod'];
                } else {
                    allowedModes = validModes.value;
                }
            } else {
                allowedModes = ['dev', 'stage', 'prod'];
            }

            const base = mask(dict, {
                allowedModes: 0,
                dev: 0,
                stage: 0,
                prod: 0,
            });

            let dev: Tagged<D, TN> | undefined;
            let stage: Tagged<S, TN> | undefined;
            let prod: Tagged<P, TN> | undefined;

            if (allowedModes.includes('dev')) {
                let devRaw = base;

                if (typeof dict.dev === 'object' && dict.dev !== null) {
                    devRaw = merge(dict.dev, base);
                }

                const validDev = devType.validate(
                    devRaw,
                    c.sub('dev', devType),
                );
                if (validDev.isLeft()) {
                    errors.push(...validDev.value);
                } else {
                    dev = validDev.value;
                }
            }
            if (allowedModes.includes('stage')) {
                let stageRaw = base;

                if (typeof dict.stage === 'object' && dict.stage !== null) {
                    stageRaw = merge(dict.stage, base);
                }

                const validStage = stageType.validate(
                    stageRaw,
                    c.sub('stage', stageType),
                );
                if (validStage.isLeft()) {
                    errors.push(...validStage.value);
                } else {
                    stage = validStage.value;
                }
            }
            if (allowedModes.includes('prod')) {
                let prodRaw = base;

                if (typeof dict.prod === 'object' && dict.prod !== null) {
                    prodRaw = merge(dict.prod, base);
                }

                const validProd = prodType.validate(
                    prodRaw,
                    c.sub('prod', prodType),
                );
                if (validProd.isLeft()) {
                    errors.push(...validProd.value);
                } else {
                    prod = validProd.value;
                }
            }

            if (dev !== undefined) {
                dev = setDefault(dev, {[typeName]: type} as any);
            }
            if (stage !== undefined) {
                stage = setDefault(stage, {[typeName]: type} as any);
            }
            if (prod !== undefined) {
                prod = setDefault(prod, {[typeName]: type} as any);
            }

            if (errors.length > 0) {
                return intoFailure(errors);
            } else {
                return intoSuccess({
                    type,
                    dev,
                    stage,
                    prod,
                });
            }
        },
        (a) => {
            throw new Error('Cannot be decoded');
        },
        devType,
        stageType,
        prodType,
        type,
    ) as BranchType<DT, ST, PT, TN>;
}
