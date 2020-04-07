/* eslint-disable @typescript-eslint/no-use-before-define */
import t from 'io-ts';

import { createRootModule, createRootModuleProfile } from '../common/config-helpers';
import { interpolated } from '../common/interpolated-string';

const rootProps = t.type({
    version: t.string,
});
const partialProps = {
    overrideVersion: interpolated(t.string),
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
