import * as t from 'io-ts';

import { HelmStringArg } from './strings';

export type HelmArg = HelmStringArg | number | boolean | HelmArrayArg | HelmObjectArg;
export interface HelmArrayArg extends Array<HelmArg> {}
export interface HelmObjectArg {
    [property: string]: HelmArg;
}

export const HelmArg: t.Type<HelmArg> = t.recursion('HelmArg', () =>
    t.union([
        HelmStringArg,
        t.number,
        t.boolean,
        HelmArrayArg,
        HelmObjectArg,
    ]),
);
export const HelmArrayArg: t.Type<HelmArrayArg> = t.recursion('HelmArrayArg', () =>
    t.array(HelmArg),
);
export const HelmObjectArg: t.Type<HelmObjectArg> = t.recursion('HelmObjectArg', () =>
    t.dictionary(HelmStringArg, HelmArg),
);

export interface HelmArgs {
    [arg: string]: any;
}
export const HelmArgs = t.dictionary(HelmStringArg, t.any);

export type HelmVersion = 2 | 3;
export const HelmVersion = t.union([
    t.literal(2),
    t.literal(3),
]);
