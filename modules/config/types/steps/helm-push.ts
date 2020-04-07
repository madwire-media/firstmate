/* eslint-disable @typescript-eslint/no-use-before-define */
import t from 'io-ts';

import { createModule, createModuleProfile } from '../common/config-helpers';
import { interpolated } from '../common/interpolated-string';
import { InterpolatedHelmChartRef, HelmRepository } from '../common/helm';
import { LocalPath } from '../common/firstmate';

const rootProps = t.type({});
const partialProps = {
    repository: interpolated(HelmRepository),
};
const requiredProps = {
    source: t.union([
        interpolated(LocalPath),
        InterpolatedHelmChartRef,
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
