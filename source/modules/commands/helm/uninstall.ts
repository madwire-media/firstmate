import { Command } from '..';

export interface HelmUninstallOptions {
    releaseName: string;

    namespace?: string;
    kubeContext?: string;
    dryRun?: boolean;
    keepHistory?: boolean;
}

export class HelmUninstallCommand implements Command {
    private readonly options: HelmUninstallOptions;

    constructor(options: HelmUninstallOptions) {
        this.options = options;
    }

    public toArgs(): string[] {
        const args = ['helm', 'uninstall', this.options.releaseName];

        if (this.options.kubeContext) {
            args.push('--kube-context', this.options.kubeContext);
        }

        if (this.options.namespace) {
            args.push('-n', this.options.namespace);
        }

        if (this.options.dryRun) {
            args.push('--dry-run');
        }

        if (this.options.keepHistory) {
            args.push('--keep-history');
        }

        return args;
    }
}
