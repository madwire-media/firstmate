/* eslint-disable @typescript-eslint/no-use-before-define */
import t from 'io-ts';

import { createServiceOrModule } from '../common/config';

const rootProps = t.type({
});
const profileProps = t.intersection([
    t.partial({
    }),
    t.type({
    }),
]);

export type HelmChartService = t.TypeOf<typeof HelmChartService>;
export const HelmChartService = createServiceOrModule(
    'HelmChartService',
    'service/helm-chart',
    rootProps,
    profileProps,
);
