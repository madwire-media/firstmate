import { Command } from '../..';
import { helmOciEnv } from './_env';

export interface HelmChartPushOptions {
    chartRef: string;
}

export class HelmChartPushCommand implements Command {
    private readonly options: HelmChartPushOptions;

    constructor(options: HelmChartPushOptions) {
        this.options = options;
    }

    public getEnv() {
        return helmOciEnv;
    }

    public toArgs(): string[] {
        return [
            'helm', 'chart', 'push', this.options.chartRef,
        ];
    }
}
