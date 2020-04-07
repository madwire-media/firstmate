/* eslint-disable @typescript-eslint/no-use-before-define */
import t from 'io-ts';

import { createModule, createModuleProfile } from '../common/config-helpers';
import { interpolated } from '../common/interpolated-string';
import {
    InterpolatedHelmChartRef, HelmRepository, HelmReleaseName, InterpolatedHelmValues,
} from '../common/helm';
import { LocalPath } from '../common/firstmate';
import { K8sContext, K8sNamespace } from '../common/k8s';

const rootProps = t.type({});
const partialProps = {
    repository: interpolated(HelmRepository),

    releaseName: interpolated(HelmReleaseName),
    values: InterpolatedHelmValues,
};
const requiredProps = {
    source: t.union([
        interpolated(LocalPath),
        InterpolatedHelmChartRef,
    ]),

    cluster: interpolated(K8sContext),
    namespace: interpolated(K8sNamespace),
};

export const helmReleaseStepKind = 'step/helm-release';

export type HelmReleaseStep = t.TypeOf<typeof HelmReleaseStep>;
export const HelmReleaseStep = createModule(
    'HelmReleaseStep',
    t.literal(helmReleaseStepKind),
    rootProps,
    t.intersection([t.partial(partialProps), t.partial(requiredProps)]),
);

export type HelmReleaseStepProfile = t.TypeOf<typeof HelmReleaseStepProfile>;
export const HelmReleaseStepProfile = createModuleProfile(
    'HelmReleaseStep',
    t.intersection([t.partial(partialProps), t.type(requiredProps)]),
);
