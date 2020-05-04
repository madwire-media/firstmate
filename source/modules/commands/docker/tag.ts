import { Command } from '..';

export interface DockerTagOptions {
    source: string;
    target: string;
}

export class DockerTagCommand implements Command {
    private options: DockerTagOptions;

    constructor(options: DockerTagOptions) {
        this.options = options;
    }

    public toArgs(): string[] {
        return [
            'docker', 'tag', this.options.source, this.options.target,
        ];
    }
}
