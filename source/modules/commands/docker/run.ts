import Os from 'os';
import { Command } from '..';
import { DockerVolumes, DockerEnv, DockerPorts } from '../../config/types/common/docker';
import { isNumber } from '../../config/helpers/is';

export interface DockerRunOptions {
    image: string;

    name?: string;
    volumes?: DockerVolumes;
    env?: DockerEnv;
    ports?: DockerPorts;
    rm?: boolean;
    entrypoint?: string;
    args?: string[];

    inheritUser?: boolean;
}

export class DockerRunCommand implements Command {
    private readonly options: DockerRunOptions;

    constructor(options: DockerRunOptions) {
        this.options = options;
    }

    public toArgs(): string[] {
        const args = ['docker', 'run', this.options.image];

        if (this.options.name) {
            args.push('-n', this.options.name);
        }

        if (this.options.rm) {
            args.push('--rm');
        }

        if (this.options.inheritUser && Os.platform() === 'linux') {
            args.push('--user', process.getuid().toString());
        }

        if (this.options.volumes) {
            for (const [containerPath, localPath] of this.options.volumes) {
                args.push('-v', `${containerPath}:${localPath}`);
            }
        }

        if (this.options.env) {
            for (const [key, value] of this.options.env) {
                args.push('-e', `${key}=${value}`);
            }
        }

        if (this.options.ports) {
            for (const port of this.options.ports) {
                if (isNumber(port)) {
                    args.push('-p', `${port}:${port}`);
                } else {
                    args.push('-p', `${port.inner}:${port.outer}`);
                }
            }
        }

        if (this.options.entrypoint) {
            args.push('--entrypoint', this.options.entrypoint);
        }

        if (this.options.args) {
            args.push('--', ...this.options.args);
        }

        return args;
    }
}
