/* eslint-disable @typescript-eslint/no-use-before-define */
import * as t from 'io-ts';
import { map } from './other';
import { ContainerPath, LocalPath } from './firstmate';
import { interpolated } from './interpolated-string';

const imageNameRegex = /^\w[\w.-]*$/;

export type DockerImageName = t.TypeOf<typeof DockerImageName>;
export const DockerImageName = t.brand(
    t.string,
    (s): s is t.Branded<string, DockerImageNameBrand> => imageNameRegex.test(s),
    'DockerImageName',
);
export interface DockerImageNameBrand {
    readonly DockerImageName: unique symbol;
}


const imageTagRegex = /^\w[\w.-]*$/;

export type DockerImageTag = t.TypeOf<typeof DockerImageTag>;
export const DockerImageTag = t.brand(
    t.string,
    (s): s is t.Branded<string, DockerImageTagBrand> => imageTagRegex.test(s),
    'DockerImageTag',
);
export interface DockerImageTagBrand {
    readonly DockerImageTag: unique symbol;
}


const registryRegex = /^[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[\w.-]+)*$/;

export type DockerRegistry = t.TypeOf<typeof DockerRegistry>;
export const DockerRegistry = t.brand(
    t.string,
    (s): s is t.Branded<string, DockerRegistryBrand> => registryRegex.test(s),
    'DockerRegistry',
);
export interface DockerRegistryBrand {
    readonly DockerRegistry: unique symbol;
}


const fullyQualifiedImageRegex = /^(?:[a-z0-9-]+(?:\.[a-z0-9-]+)+\/)?(?:[\w.-]+)(?:\/[\w.-]+)*(?::\w[\w.-]*)$/;

export type DockerImage = t.TypeOf<typeof DockerImage>;
export const DockerImage = t.brand(
    t.string,
    (s): s is t.Branded<string, DockerImageBrand> => fullyQualifiedImageRegex.test(s),
    'DockerImage',
);
export interface DockerImageBrand {
    readonly DockerImage: unique symbol;
}


const dockerArgNameRegex = /^[a-zA-Z0-9_-]+$/;

export type DockerArgName = t.TypeOf<typeof DockerArgName>;
export const DockerArgName = t.brand(
    t.string,
    (s): s is t.Branded<string, DockerArgNameBrand> => dockerArgNameRegex.test(s),
    'DockerArgName',
);
export interface DockerArgNameBrand {
    readonly DockerArgName: unique symbol;
}


const dockerVolumeNameRegex = /^[a-zA-Z0-9_-]+$/;

export type DockerVolumeName = t.TypeOf<typeof DockerVolumeName>;
export const DockerVolumeName = t.brand(
    t.string,
    (s): s is t.Branded<string, DockerVolumeNameBrand> => dockerVolumeNameRegex.test(s),
    'DockerVolumeName',
);
export interface DockerVolumeNameBrand {
    readonly DockerVolumeName: unique symbol;
}

export type InterpolatedDockerArgs = t.TypeOf<typeof InterpolatedDockerArgs>;
export const InterpolatedDockerArgs = map(
    DockerArgName,
    interpolated(t.string),
    'InterpolatedDockerArgs',
);

export type DockerArgs = t.TypeOf<typeof DockerArgs>;
export const DockerArgs = map(DockerArgName, t.string, 'DockerArgs');

export type InterpolatedDockerEnv = t.TypeOf<typeof InterpolatedDockerEnv>;
export const InterpolatedDockerEnv = map(
    t.string,
    interpolated(t.string),
    'InterpolatedDockerEnv',
);

export type DockerEnv = t.TypeOf<typeof DockerEnv>;
export const DockerEnv = map(t.string, t.string, 'DockerEnv');

export type InterpolatedDockerCommand = t.TypeOf<typeof InterpolatedDockerCommand>;
export const InterpolatedDockerCommand = t.array(
    interpolated(t.string),
    'InterpolatedDockerCommand',
);

export type DockerCommand = t.TypeOf<typeof DockerCommand>;
export const DockerCommand = t.array(t.string, 'DockerCommand');

export type PortNumber = t.TypeOf<typeof PortNumber>;
export const PortNumber = t.brand(
    t.Int,
    (n): n is t.Branded<t.Int, PortNumberBrand> => n > 0 && n < 65536,
    'PortNumber',
);
export interface PortNumberBrand {
    readonly PortNumber: unique symbol;
}

export type PortMap = t.TypeOf<typeof PortMap>;
export const PortMap = t.type({
    inner: PortNumber,
    outer: PortNumber,
}, 'PortMap');

export type DockerPorts = t.TypeOf<typeof DockerPorts>;
export const DockerPorts = t.array(
    t.union([
        PortNumber,
        PortMap,
    ]),
    'DockerPorts',
);

export type DockerVolumeSource = t.TypeOf<typeof DockerVolumeSource>;
export const DockerVolumeSource = t.union([
    t.literal('tmpfs'),
    DockerVolumeName,
    LocalPath,
]);

export type InterpolatedDockerVolumes = t.TypeOf<typeof InterpolatedDockerVolumes>;
export const InterpolatedDockerVolumes = map(
    interpolated(ContainerPath),
    interpolated(DockerVolumeSource),
    'InterpolatedDockerVolumes',
);

export type DockerVolumes = t.TypeOf<typeof DockerVolumes>;
export const DockerVolumes = map(
    ContainerPath,
    DockerVolumeSource,
    'DockerVolumes',
);
