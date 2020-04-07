/* eslint-disable @typescript-eslint/no-use-before-define */
import t from 'io-ts';

import { createModule, createModuleProfile } from '../common/config-helpers';
import { DockerArgs } from '../common/docker';

const rootProps = t.type({});
const partialProps = {
    buildArgs: DockerArgs,
    alwaysPull: t.boolean,
};
const requiredProps = {};

export const dockerImageSourceKind = 'source/docker-image';

export type DockerImageSource = t.TypeOf<typeof DockerImageSource>;
export const DockerImageSource = createModule(
    'DockerImageSource',
    t.literal(dockerImageSourceKind),
    rootProps,
    t.intersection([t.partial(partialProps), t.partial(requiredProps)]),
);

export type DockerImageSourceProfile = t.TypeOf<typeof DockerImageSourceProfile>;
export const DockerImageSourceProfile = createModuleProfile(
    'DockerImageSource',
    t.intersection([t.partial(partialProps), t.type(requiredProps)]),
);
