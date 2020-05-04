import { Command } from '../..';
import { helmOciEnv } from './_env';

export interface HelmChartExportOptions {
    chartRef: string;

    outDir?: string;
}

export class HelmChartExportCommand implements Command {
    private readonly options: HelmChartExportOptions;

    constructor(options: HelmChartExportOptions) {
        this.options = options;
    }

    public getEnv() {
        return helmOciEnv;
    }

    public toArgs(): string[] {
        const args = ['helm', 'chart', 'export', this.options.chartRef];

        if (this.options.outDir) {
            args.push('-o', this.options.outDir);
        }

        return args;
    }
}
