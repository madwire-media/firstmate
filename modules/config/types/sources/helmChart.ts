/* eslint-disable @typescript-eslint/no-use-before-define */
import t from 'io-ts';

import { createModule } from '../common/config-helpers';

const rootProps = t.type({
});
const profileProps = t.intersection([
    t.partial({
    }),
    t.type({
    }),
]);

export type HelmChartService = t.TypeOf<typeof HelmChartService>;
export const HelmChartService = createModule(
    'HelmChartService',
    'service/helm-chart',
    rootProps,
    profileProps,
);
