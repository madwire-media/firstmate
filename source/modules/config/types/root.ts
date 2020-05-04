/* eslint-disable @typescript-eslint/no-use-before-define */
import * as t from 'io-ts';

export type RootConfig = t.TypeOf<typeof RootConfig>;
export const RootConfig = t.type({
    firstmateVersion: t.Int,
    project: t.string,
}, 'RootConfig');
