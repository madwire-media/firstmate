/* eslint-disable @typescript-eslint/no-use-before-define */
import t from 'io-ts';

export type RootConfig = t.TypeOf<typeof RootConfig>;
export const RootConfig = t.type({
    firstmateVersion: t.string,
    project: t.string,
}, 'RootConfig');
