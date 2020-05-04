/* eslint-disable @typescript-eslint/no-use-before-define */
import * as t from 'io-ts';

import { createModule, createModuleProfile } from '../common/config-helpers';
import { interpolated } from '../common/interpolated-string';
import { DockerImage, DockerImageName, DockerRegistry } from '../common/docker';
import { ModuleTypes } from '../common/config';

const rootProps = t.type({});
const partialProps = {
    registry: interpolated(DockerRegistry),
};
const requiredProps = {
    source: interpolated(DockerImage),
    imageName: interpolated(DockerImageName),
};

export const dockerPushStepKind = 'step/docker-push';

export type DockerPushStep = t.TypeOf<typeof DockerPushStep>;
export const DockerPushStep = createModule(
    'DockerPushStep',
    t.literal(dockerPushStepKind),
    rootProps,
    t.intersection([t.partial(partialProps), t.partial(requiredProps)]),
);

export type DockerPushStepProfile = t.TypeOf<typeof DockerPushStepProfile>;
export const DockerPushStepProfile = createModuleProfile(
    'DockerPushStep',
    t.intersection([t.partial(partialProps), t.type(requiredProps)]),
);

export type DockerPushStepTypes = ModuleTypes<DockerPushStep, DockerPushStepProfile, false>;
