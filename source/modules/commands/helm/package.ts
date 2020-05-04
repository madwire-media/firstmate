import { Command } from '..';

export interface HelmPackageOptions {
    path: string;

    outDir?: string;
    version?: string;
    appVersion?: string;
    dependencyUpdate?: boolean;
}

export class HelmPackageCommand implements Command {
    private readonly options: HelmPackageOptions;

    constructor(options: HelmPackageOptions) {
        this.options = options;
    }

    public toArgs(): string[] {
        const args = ['helm', 'package', this.options.path];

        if (this.options.dependencyUpdate) {
            args.push('-u');
        }

        if (this.options.appVersion) {
            args.push('--app-version', this.options.appVersion);
        }

        if (this.options.version) {
            args.push('--version', this.options.version);
        }

        if (this.options.outDir) {
            args.push('-d', this.options.outDir);
        }

        return args;
    }
}
