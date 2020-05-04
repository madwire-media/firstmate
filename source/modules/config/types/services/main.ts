/* eslint-disable @typescript-eslint/no-use-before-define */
import * as t from 'io-ts';

import { createRootModule, createRootModuleProfile } from '../common/config-helpers';
import { interpolated } from '../common/interpolated-string';
import { ModuleTypes } from '../common/config';
import { VersionName } from '../common/config-names';

const rootProps = t.type({
    version: VersionName,
});
const partialProps = {
    overrideVersion: interpolated(VersionName),
    allowedBranches: t.array(t.string),
    versionLocked: t.boolean,
};
const requiredProps = {};

export const mainServiceKind = 'service/main';

export type MainService = t.TypeOf<typeof MainService>;
export const MainService = createRootModule(
    'MainService',
    t.literal(mainServiceKind),
    rootProps,
    t.intersection([t.partial(partialProps), t.partial(requiredProps)]),
);

export type MainServiceProfile = t.TypeOf<typeof MainServiceProfile>;
export const MainServiceProfile = createRootModuleProfile(
    'MainService',
    t.intersection([t.partial(partialProps), t.type(requiredProps)]),
);

export type MainServiceTypes = ModuleTypes<MainService, MainServiceProfile, false>;
