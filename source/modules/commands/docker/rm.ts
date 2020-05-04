import { Command } from '..';

export interface DockerRmOptions {
    container: string;
}

export class DockerRmCommand implements Command {
    private readonly options: DockerRmOptions;

    constructor(options: DockerRmOptions) {
        this.options = options;
    }

    public toArgs(): string[] {
        return [
            'docker', 'rm', this.options.container,
        ];
    }
}
