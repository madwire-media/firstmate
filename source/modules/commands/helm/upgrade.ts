import { Command } from '..';

export interface HelmUpgradeOptions {
    releaseName: string;
    chart: string;

    install?: boolean;
    atomic?: boolean;
    repository?: string;
    version?: string;
    kubeContext?: string;
    namespace?: string;
    valuesFiles?: string[];
    dryRun?: boolean;
}

export class HelmUpgradeCommand implements Command {
    private readonly options: HelmUpgradeOptions;

    constructor(options: HelmUpgradeOptions) {
        this.options = options;
    }

    public toArgs(): string[] {
        const args = ['helm', 'upgrade', this.options.releaseName, this.options.chart];

        if (this.options.install) {
            args.push('-i');
        }

        if (this.options.atomic) {
            args.push('--atomic');
        }

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
