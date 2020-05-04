/* eslint-disable @typescript-eslint/no-use-before-define */
import * as t from 'io-ts';

const localPathRegex = /^\.\.?(?:\/[a-zA-Z0-9_.-]+)*$/;

export type LocalPath = t.TypeOf<typeof LocalPath>;
export const LocalPath = t.brand(
    t.string,
    (s): s is t.Branded<string, LocalPathBrand> => localPathRegex.test(s),
    'LocalPath',
);
export interface LocalPathBrand {
    readonly LocalPath: unique symbol;
}


const projectPathRegex = /^(?:[.]*[a-zA-Z0-9_-][a-zA-Z0-9_.-]*)(?:\/[a-zA-Z0-9_.-]+)*$/;

export type ProjectPath = t.TypeOf<typeof ProjectPath>;
export const ProjectPath = t.brand(
    t.string,
    (s): s is t.Branded<string, ProjectPathBrand> => projectPathRegex.test(s),
    'ProjectPath',
);
export interface ProjectPathBrand {
    readonly ProjectPath: unique symbol;
}


export type AnyPath = t.TypeOf<typeof AnyPath>;
export const AnyPath = t.union([
    LocalPath,
    ProjectPath,
]);


const containerPathRegex = /^(?:\/|(?:\/[a-zA-Z0-9_.-]+)+)$/;
export type ContainerPath = t.TypeOf<typeof ContainerPath>;

export const ContainerPath = t.brand(
    t.string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (s): s is t.Branded<string, ContainerPathBrand> => containerPathRegex.test(s),
    'ContainerPath',
);
export interface ContainerPathBrand {
    readonly ContainerPath: unique symbol;
}
