import { Command } from '..';

export interface HelmStatusOptions {
    release: string;

    kubeContext?: string;
    namespace?: string;
    output?: 'table' | 'json' | 'yaml';
}

export class HelmStatusCommand implements Command {
    private readonly options: HelmStatusOptions;

    constructor(options: HelmStatusOptions) {
        this.options = options;
    }

    public toArgs(): string[] {
        const args = ['helm', 'status', this.options.release];

        if (this.options.kubeContext) {
            args.push('--kube-context', this.options.kubeContext);
        }

        if (this.options.namespace) {
            args.push('-n', this.options.namespace);
        }

        if (this.options.output) {
            args.push('-o', this.options.output);
        }

        return args;
    }
}
