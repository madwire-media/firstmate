import { Command } from '../..';

export interface DockerVolumeCreateOptions {
    volume: string;
}

export class DockerVolumeCreateCommand implements Command {
    private readonly options: DockerVolumeCreateOptions;

    constructor(options: DockerVolumeCreateOptions) {
        this.options = options;
    }

    public toArgs(): string[] {
        return [
            'docker', 'volume', 'create', this.options.volume,
        ];
    }
}
