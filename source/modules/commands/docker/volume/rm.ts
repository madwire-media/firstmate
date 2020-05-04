import { Command } from '../..';

export interface DockerVolumeRmOptions {
    volume: string;

    force?: boolean;
}

export class DockerVolumeRmCommand implements Command {
    private readonly options: DockerVolumeRmOptions;

    constructor(options: DockerVolumeRmOptions) {
        this.options = options;
    }

    public toArgs(): string[] {
        const args = ['docker', 'volume', 'rm', this.options.volume];

        if (this.options.force) {
            args.push('-f');
        }

        return args;
    }
}
