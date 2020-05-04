/* eslint-disable @typescript-eslint/no-use-before-define */
import * as t from 'io-ts';

import { createModule, createModuleProfile } from '../common/config-helpers';
import { interpolated } from '../common/interpolated-string';
import { ModuleTypes } from '../common/config';
import { VersionName } from '../common/config-names';

const rootProps = t.type({
    version: interpolated(VersionName),
});
const partialProps = {
    overrideVersion: interpolated(VersionName),
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

export type ChildServiceTypes = ModuleTypes<ChildService, ChildServiceProfile, false>;
