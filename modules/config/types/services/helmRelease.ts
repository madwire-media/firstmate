/* eslint-disable @typescript-eslint/no-use-before-define */
import t from 'io-ts';

import { ModulePath } from '../common/firstmate';
import { interpolated } from '../common/interpolated-string';
import { HelmRepository, InterpolatedHelmValues, HelmReleaseName } from '../common/helm';
import { K8sNamespace, K8sContext } from '../common/k8s';
import { createServiceOrModule } from '../common/config';

const rootProps = t.type({
    sourceModule: ModulePath,
});
const profileProps = t.intersection([
    t.partial({
        releaseName: interpolated(HelmReleaseName),
        repository: interpolated(HelmRepository),
        values: InterpolatedHelmValues,
    }),
    t.type({
        cluster: interpolated(K8sContext),
        namespace: interpolated(K8sNamespace),
    }),
]);

export type HelmReleaseService = t.TypeOf<typeof HelmReleaseService>;
export const HelmReleaseService = createServiceOrModule(
    'HelmReleaseService',
    'service/helm-release',
    rootProps,
    profileProps,
);
