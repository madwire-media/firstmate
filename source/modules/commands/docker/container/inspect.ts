import { Command } from '../..';

export interface DockerContainerInspectOptions {
    container: string;
}

export class DockerContainerInspectCommand implements Command {
    private readonly options: DockerContainerInspectOptions;

    constructor(options: DockerContainerInspectOptions) {
        this.options = options;
    }

    public toArgs(): string[] {
        return [
            'docker', 'container', 'inspect', this.options.container,
        ];
    }
}
