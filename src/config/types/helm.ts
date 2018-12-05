import * as t from 'io-ts';

import { HelmArg } from './strings';

export interface HelmArgs {
    [arg: string]: HelmArg;
}
export const HelmArgs = t.dictionary(HelmArg, HelmArg);
