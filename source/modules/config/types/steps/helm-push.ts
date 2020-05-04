/* eslint-disable @typescript-eslint/no-use-before-define */
import * as t from 'io-ts';

import { createModule, createModuleProfile } from '../common/config-helpers';
import { interpolated } from '../common/interpolated-string';
import { InterpolatedHelmChartRef, HelmRepository } from '../common/helm';
import { LocalPath, ProjectPath } from '../common/firstmate';
import { ModuleTypes } from '../common/config';
import { DockerImage, DockerRegistry, DockerImageName } from '../common/docker';

const rootProps = t.type({});
const partialProps = {};
const requiredProps = {
    source: t.union([
        interpolated(t.union([DockerImage, ProjectPath, LocalPath])),
        InterpolatedHelmChartRef,
    ]),
    dest: t.union([
        t.type({
            chartMuseum: interpolated(HelmRepository),
        }),
        t.intersection([
            t.partial({
                registry: interpolated(DockerRegistry),
            }),
            t.type({
                imageName: interpolated(DockerImageName),
            }),
        ]),
    ]),
};

export const helmPushStepKind = 'step/helm-push';

export type HelmPushStep = t.TypeOf<typeof HelmPushStep>;
export const HelmPushStep = createModule(
    'HelmPushStep',
    t.literal(helmPushStepKind),
    rootProps,
    t.intersection([t.partial(partialProps), t.partial(requiredProps)]),
);

export type HelmPushStepProfile = t.TypeOf<typeof HelmPushStepProfile>;
export const HelmPushStepProfile = createModuleProfile(
    'HelmPushStep',
    t.intersection([t.partial(partialProps), t.type(requiredProps)]),
);

export type HelmPushStepTypes = ModuleTypes<HelmPushStep, HelmPushStepProfile, false>;
