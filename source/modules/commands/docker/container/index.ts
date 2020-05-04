import { DockerContainerInspectOptions, DockerContainerInspectCommand } from './inspect';

export const container = {
    inspect: (options: DockerContainerInspectOptions) => new DockerContainerInspectCommand(options),
};
