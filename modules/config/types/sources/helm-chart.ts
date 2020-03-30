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

export type HelmChartSource = t.TypeOf<typeof HelmChartSource>;
export const HelmChartSource = createModule(
    'HelmChartSource',
    'source/helm-chart',
    rootProps,
    profileProps,
);
