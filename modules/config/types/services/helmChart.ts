/* eslint-disable @typescript-eslint/no-use-before-define */
import t from 'io-ts';

import { createServiceOrModule } from '../common/config';
import { interpolated } from '../common/interpolated-string';
import { HelmRepository } from '../common/helm';
import { ModulePath } from '../common/firstmate';

const rootProps = t.type({
    sourceModule: ModulePath,
});
const profileProps = t.intersection([
    t.partial({
    }),
    t.type({
        repository: interpolated(HelmRepository),
    }),
]);

export type HelmChartService = t.TypeOf<typeof HelmChartService>;
export const HelmChartService = createServiceOrModule(
    'HelmChartService',
    'service/helm-chart',
    rootProps,
    profileProps,
);
