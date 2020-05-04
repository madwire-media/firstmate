import { Command } from '..';

export interface DockerPushOptions {
    imageRef: string;
}

export class DockerPushCommand implements Command {
    private readonly options: DockerPushOptions;

    constructor(options: DockerPushOptions) {
        this.options = options;
    }

    public toArgs(): string[] {
        return [
            'docker', 'push', this.options.imageRef,
        ];
    }
}
