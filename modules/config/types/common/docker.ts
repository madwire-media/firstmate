/* eslint-disable @typescript-eslint/no-use-before-define */
import t, { string } from 'io-ts';
import { map } from './other';

const imageNameRegex = /^\w[\w.-]+$/;

export type DockerImageName = t.TypeOf<typeof DockerImageName>;
export const DockerImageName = t.brand(
    t.string,
    (s): s is t.Branded<string, DockerImageNameBrand> => imageNameRegex.test(s),
    'DockerImageName',
);
export interface DockerImageNameBrand {
    readonly DockerImageName: unique symbol;
}


const registryRegex = /^[a-z0-9-]+(?:\.[a-z0-9-]+)(?:\/[a-z0-9-])$/;

export type DockerRegistry = t.TypeOf<typeof DockerRegistry>;
export const DockerRegistry = t.brand(
    t.string,
    (s): s is t.Branded<string, DockerRegistryBrand> => registryRegex.test(s),
    'DockerRegistry',
);
export interface DockerRegistryBrand {
    readonly DockerRegistry: unique symbol;
}


const fullyQualifiedImageRegex = /^[a-z0-9-]+(?:\.[a-z0-9-]+)(?:\/[a-z0-9-])\w[\w.-]+$/;

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

export type DockerArgs = t.TypeOf<typeof DockerArgs>;
export const DockerArgs = map(DockerArgName, t.string, 'DockerArgs');
