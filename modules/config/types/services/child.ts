/* eslint-disable @typescript-eslint/no-use-before-define */
import t from 'io-ts';

import { createModule, createModuleProfile } from '../common/config-helpers';
import { interpolated } from '../common/interpolated-string';

const rootProps = t.type({
    version: interpolated(t.string),
});
const partialProps = {
    overrideVersion: interpolated(t.string),
};
const requiredProps = {};

export const childServiceKind = 'service/child';

export type ChildService = t.TypeOf<typeof ChildService>;
export const ChildService = createModule(
    'ChildService',
    t.literal(childServiceKind),
    rootProps,
    t.intersection([t.partial(partialProps), t.partial(requiredProps)]),
);

export type ChildServiceProfile = t.TypeOf<typeof ChildServiceProfile>;
export const ChildServiceProfile = createModuleProfile(
    'ChildService',
    t.intersection([t.partial(partialProps), t.type(requiredProps)]),
);
