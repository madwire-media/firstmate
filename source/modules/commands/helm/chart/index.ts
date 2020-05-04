import { HelmChartExportOptions, HelmChartExportCommand } from './export';
import { HelmChartPullOptions, HelmChartPullCommand } from './pull';
import { HelmChartPushOptions, HelmChartPushCommand } from './push';
import { HelmChartSaveOptions, HelmChartSaveCommand } from './save';

export const chart = {
    export: (options: HelmChartExportOptions) => new HelmChartExportCommand(options),
    pull: (options: HelmChartPullOptions) => new HelmChartPullCommand(options),
    push: (options: HelmChartPushOptions) => new HelmChartPushCommand(options),
    save: (options: HelmChartSaveOptions) => new HelmChartSaveCommand(options),
};
