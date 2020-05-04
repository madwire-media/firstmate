/* eslint-disable @typescript-eslint/no-use-before-define */
import * as t from 'io-ts';

import { createModule, createModuleProfile } from '../common/config-helpers';
import { InterpolatedDockerArgs, DockerImageName } from '../common/docker';
import { InterpolatedCopyFiles, ModuleTypes } from '../common/config';

const rootProps = t.type({});
const partialProps = {
    copyFiles: InterpolatedCopyFiles,
    buildArgs: InterpolatedDockerArgs,
    alwaysPull: t.boolean,
    localImageName: DockerImageName,
    shouldVersionLocalImage: t.boolean,
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

export type DockerImageSourceTypes = ModuleTypes<DockerImageSource, DockerImageSourceProfile, true>;
