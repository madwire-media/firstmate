/* eslint-disable @typescript-eslint/no-use-before-define */
import t from 'io-ts';

// TODO: Add a regex to this type
export type LocalPath = t.TypeOf<typeof LocalPath>;
export const LocalPath = t.brand(
    t.string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_s): _s is t.Branded<string, LocalPathBrand> => true,
    'LocalPath',
);
export interface LocalPathBrand {
    readonly LocalPath: unique symbol;
}


// TODO: Add a regex to this type
export type ContainerPath = t.TypeOf<typeof ContainerPath>;
export const ContainerPath = t.brand(
    t.string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_s): _s is t.Branded<string, ContainerPathBrand> => true,
    'ContainerPath',
);
export interface ContainerPathBrand {
    readonly ContainerPath: unique symbol;
}
