import { Command } from '../..';
import { helmOciEnv } from './_env';

export interface HelmChartPullOptions {
    chartRef: string;
}

export class HelmChartPullCommand implements Command {
    private readonly options: HelmChartPullOptions;

    constructor(options: HelmChartPullOptions) {
        this.options = options;
    }

    public getEnv() {
        return helmOciEnv;
    }

    public toArgs(): string[] {
        return [
            'helm', 'chart', 'pull', this.options.chartRef,
        ];
    }
}
