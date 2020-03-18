/* eslint-disable @typescript-eslint/no-use-before-define */
import t from 'io-ts';

// eslint-disable-next-line import/no-cycle
import type { ParamNameBrand } from './config';

const projectNameRegex = /^[0-9a-z]+(?:-[0-9a-z]+)$/;
const projectNameMaxLength = 31;

export type ProjectName = t.TypeOf<typeof ProjectName>;
export const ProjectName = t.brand(
    t.string,
    (s): s is t.Branded<string, ProjectNameBrand> => (
        projectNameRegex.test(s)
        && s.length <= projectNameMaxLength
    ),
    'ProjectName',
);
export interface ProjectNameBrand {
    readonly ProjectName: unique symbol;
}


const profileNameRegex = /^[a-zA-Z]$/;

export type ProfileName = t.TypeOf<typeof ProfileName>;
export const ProfileName = t.brand(
    t.string,
    (s): s is t.Branded<string, ProfileNameBrand> => profileNameRegex.test(s),
    'ProfileName',
);
export interface ProfileNameBrand extends ParamNameBrand {
    readonly ProfileName: unique symbol;
}


const serviceOrModulePathRegex = /^[a-z0-9.-]+(?:\/[a-z0-9.-]+)*|\.\.?(?:\/[a-z0-9.-]+)+$/;

export type ServicePath = t.TypeOf<typeof ServicePath>;
export const ServicePath = t.brand(
    t.string,
    (s): s is t.Branded<string, ServicePathBrand> => serviceOrModulePathRegex.test(s),
    'ServicePath',
);
export interface ServicePathBrand {
    readonly ServicePath: unique symbol;
}

export type ModulePath = t.TypeOf<typeof ModulePath>;
export const ModulePath = t.brand(
    t.string,
    (s): s is t.Branded<string, ModulePathBrand> => serviceOrModulePathRegex.test(s),
    'ModulePath',
);
export interface ModulePathBrand {
    readonly ModulePath: unique symbol;
}
