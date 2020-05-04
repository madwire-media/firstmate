/* eslint-disable @typescript-eslint/no-use-before-define */
import * as t from 'io-ts';

import { createModule, createModuleProfile } from '../common/config-helpers';
import { InterpolatedCopyFiles, ModuleTypes } from '../common/config';

const rootProps = t.type({});
const partialProps = {
    copyFiles: InterpolatedCopyFiles,
};
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

export type HelmChartSourceTypes = ModuleTypes<HelmChartSource, HelmChartSourceProfile, true>;
