import { Command } from '..';
import { DockerArgs } from '../../config/types/common/docker';

export interface DockerBuildOptions {
    context: string;

    dockerfile?: string;
    imageIdFile?: string;
    alwaysPull?: boolean;
    buildArgs?: DockerArgs;
    tags?: string[];
}

export class DockerBuildCommand implements Command {
    private readonly options: DockerBuildOptions;

    constructor(options: DockerBuildOptions) {
        this.options = options;
    }

    public toArgs(): string[] {
        const args = ['docker', 'build', this.options.context];

        if (this.options.imageIdFile) {
            args.push('--iidfile', this.options.imageIdFile);
        }

        if (this.options.alwaysPull) {
            args.push('--pull');
        }

        if (this.options.buildArgs) {
            for (const [key, value] of this.options.buildArgs.entries()) {
                args.push(`${key}=${value}`);
            }
        }

        if (this.options.tags) {
            for (const tag of this.options.tags) {
                args.push('-t', tag);
            }
        }

        if (this.options.dockerfile) {
            args.push('-f', this.options.dockerfile);
        }

        return args;
    }
}
