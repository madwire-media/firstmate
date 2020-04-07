/* eslint-disable @typescript-eslint/no-use-before-define */
import t from 'io-ts';

import { createModule, createModuleProfile } from '../common/config-helpers';

const rootProps = t.type({});
const partialProps = {};
const requiredProps = {};

export const helmChartSourceKind = 'source/helm-chart';

export type HelmChartSource = t.TypeOf<typeof HelmChartSource>;
export const HelmChartSource = createModule(
    'HelmChartSource',
    t.literal(helmChartSourceKind),
    rootProps,
    t.intersection([t.partial(partialProps), t.partial(requiredProps)]),
);

export type HelmChartSourceProfile = t.TypeOf<typeof HelmChartSourceProfile>;
export const HelmChartSourceProfile = createModuleProfile(
    'HelmChartSource',
    t.intersection([t.partial(partialProps), t.type(requiredProps)]),
);
