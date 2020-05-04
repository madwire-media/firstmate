import { Command } from '..';

export interface HelmFetchOptions {
    chartOrUrl: string;

    version?: string;
    outDir?: string;
}

export class HelmFetchCommand implements Command {
    private readonly options: HelmFetchOptions;

    constructor(options: HelmFetchOptions) {
        this.options = options;
    }

    public toArgs(): string[] {
        const args = ['helm', 'fetch', this.options.chartOrUrl];

        if (this.options.version) {
            args.push('--version', this.options.version);
        }

        if (this.options.outDir) {
            args.push('-d', this.options.outDir);
        }

        return args;
    }
}
