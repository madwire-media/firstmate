/* eslint-disable @typescript-eslint/no-use-before-define */
import * as t from 'io-ts';

import { createModule, createModuleProfile } from '../common/config-helpers';
import {
    InterpolatedDockerEnv,
    InterpolatedDockerCommand,
    InterpolatedDockerVolumes,
    DockerPorts,
    DockerImage,
} from '../common/docker';
import { interpolated } from '../common/interpolated-string';
import { ModuleTypes } from '../common/config';

const rootProps = t.type({});
const partialProps = {
    env: InterpolatedDockerEnv,
    command: InterpolatedDockerCommand,
    setEntrypoint: t.boolean,
    volumes: InterpolatedDockerVolumes,
    ports: DockerPorts,
};
const requiredProps = {
    source: interpolated(DockerImage),
};

export const containerStepKind = 'step/container';

export type ContainerStep = t.TypeOf<typeof ContainerStep>;
export const ContainerStep = createModule(
    'ContainerStep',
    t.literal(containerStepKind),
    rootProps,
    t.intersection([t.partial(partialProps), t.partial(requiredProps)]),
);

export type ContainerStepProfile = t.TypeOf<typeof ContainerStepProfile>;
export const ContainerStepProfile = createModuleProfile(
    'ContainerStep',
    t.intersection([t.partial(partialProps), t.type(requiredProps)]),
);

export type ContainerStepTypes = ModuleTypes<ContainerStep, ContainerStepProfile, false>;
