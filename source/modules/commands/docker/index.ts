import { container } from './container';
import { volume } from './volume';
import { DockerBuildOptions, DockerBuildCommand } from './build';
import { DockerPushOptions, DockerPushCommand } from './push';
import { DockerRmOptions, DockerRmCommand } from './rm';
import { DockerRunOptions, DockerRunCommand } from './run';
import { DockerTagOptions, DockerTagCommand } from './tag';
import { DockerStopOptions, DockerStopCommand } from './stop';

export const Docker = {
    container,
    volume,

    build: (options: DockerBuildOptions) => new DockerBuildCommand(options),
    push: (options: DockerPushOptions) => new DockerPushCommand(options),
    rm: (options: DockerRmOptions) => new DockerRmCommand(options),
    run: (options: DockerRunOptions) => new DockerRunCommand(options),
    tag: (options: DockerTagOptions) => new DockerTagCommand(options),
    stop: (options: DockerStopOptions) => new DockerStopCommand(options),
};
