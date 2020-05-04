import { DockerVolumeCreateOptions, DockerVolumeCreateCommand } from './create';
import { DockerVolumeInspectOptions, DockerVolumeInspectCommand } from './inspect';
import { DockerVolumeRmOptions, DockerVolumeRmCommand } from './rm';

export const volume = {
    create: (options: DockerVolumeCreateOptions) => new DockerVolumeCreateCommand(options),
    inspect: (options: DockerVolumeInspectOptions) => new DockerVolumeInspectCommand(options),
    rm: (options: DockerVolumeRmOptions) => new DockerVolumeRmCommand(options),
};
