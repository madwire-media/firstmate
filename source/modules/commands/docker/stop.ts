import { Command } from '..';

export interface DockerStopOptions {
    container: string;
}

export class DockerStopCommand implements Command {
    private readonly options: DockerStopOptions;

    constructor(options: DockerStopOptions) {
        this.options = options;
    }

    public toArgs(): string[] {
        return [
            'docker', 'stop', this.options.container,
        ];
    }
}
