/* eslint-disable @typescript-eslint/no-use-before-define */
import t from 'io-ts';

import { createModule, createModuleProfile } from '../common/config-helpers';
import {
    InterpolatedDockerEnv,
    InterpolatedDockerCommand,
    InterpolatedDockerVolumes,
    DockerPorts,
    DockerImage,
} from '../common/docker';
import { interpolated } from '../common/interpolated-string';

const rootProps = t.type({});
const partialProps = {
    env: InterpolatedDockerEnv,
    command: InterpolatedDockerCommand,
    setEntrypoint: t.boolean,
    volumes: InterpolatedDockerVolumes,
    ports: DockerPorts,

    proxy: t.boolean,
};
const requiredProps = {
    source: interpolated(DockerImage),
};

export const deferredContainerStepKind = 'step/deferred-container';

export type DeferredContainerStep = t.TypeOf<typeof DeferredContainerStep>;
export const DeferredContainerStep = createModule(
    'DeferredContainerStep',
    t.literal(deferredContainerStepKind),
    rootProps,
    t.intersection([t.partial(partialProps), t.partial(requiredProps)]),
);

export type DeferredContainerStepProfile = t.TypeOf<typeof DeferredContainerStepProfile>;
export const DeferredContainerStepProfile = createModuleProfile(
    'DeferredContainerStep',
    t.intersection([t.partial(partialProps), t.type(requiredProps)]),
);
