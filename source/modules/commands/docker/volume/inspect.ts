import { Command } from '../..';

export interface DockerVolumeInspectOptions {
    volume: string;
}

export class DockerVolumeInspectCommand implements Command {
    private readonly options: DockerVolumeInspectOptions;

    constructor(options: DockerVolumeInspectOptions) {
        this.options = options;
    }

    public toArgs(): string[] {
        return [
            'docker', 'volume', 'inspect', this.options.volume,
        ];
    }
}
