import { Command } from '..';

export interface HelmInstallOptions {
    releaseName: string;
    chart: string;

    repository?: string;
    version?: string;
    kubeContext?: string;
    namespace?: string;
    valuesFiles?: string[];
    dryRun?: boolean;
}

export class HelmInstallCommand implements Command {
    private readonly options: HelmInstallOptions;

    constructor(options: HelmInstallOptions) {
        this.options = options;
    }

    public toArgs(): string[] {
        const args = ['helm', 'install', this.options.releaseName, this.options.chart];

        if (this.options.repository) {
            args.push('--repo', this.options.repository);
        }

        if (this.options.version) {
            args.push('--version', this.options.version);
        }

        if (this.options.kubeContext) {
            args.push('--kube-context', this.options.kubeContext);
        }

        if (this.options.namespace) {
            args.push('-n', this.options.namespace);
        }

        if (this.options.valuesFiles) {
            for (const valuesFile of this.options.valuesFiles) {
                args.push('-f', valuesFile);
            }
        }

        if (this.options.dryRun) {
            args.push('--dry-run');
        }

        return args;
    }
}
