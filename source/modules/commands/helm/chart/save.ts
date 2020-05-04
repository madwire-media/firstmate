import { Command } from '../..';
import { helmOciEnv } from './_env';

export interface HelmChartSaveOptions {
    path: string;
    chartRef: string;
}

export class HelmChartSaveCommand implements Command {
    private readonly options: HelmChartSaveOptions;

    constructor(options: HelmChartSaveOptions) {
        this.options = options;
    }

    public getEnv() {
        return helmOciEnv;
    }

    public toArgs(): string[] {
        return [
            'helm', 'chart', 'save', this.options.path, this.options.chartRef,
        ];
    }
}
