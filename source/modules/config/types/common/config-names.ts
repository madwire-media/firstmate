/* eslint-disable @typescript-eslint/no-use-before-define */
import * as t from 'io-ts';

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


const profileNameRegex = /^[a-zA-Z0-9-]+$/;

export type ProfileName = t.TypeOf<typeof ProfileName>;
export const ProfileName = t.brand(
    t.string,
    (s): s is t.Branded<string, ProfileNameBrand> => profileNameRegex.test(s),
    'ProfileName',
);
export interface ProfileNameBrand extends ParamNameBrand, ProfileGlobNameBrand {
    readonly ProfileName: unique symbol;
}


const profileGlobNameRegex = /^(?:[a-zA-Z0-9-]+\*|\*)?$/;

export type ProfileGlobName = t.TypeOf<typeof ProfileGlobName>;
export const ProfileGlobName = t.brand(
    t.string,
    (s): s is t.Branded<string, ProfileGlobNameBrand> => profileGlobNameRegex.test(s),
    'ProfileGlobName',
);
export interface ProfileGlobNameBrand {
    readonly ProfileGlobName: unique symbol;
}


const modulePathRegex = /^[a-z0-9.-]+(?:\/[a-z0-9.-]+)*|\.\.?(?:\/[a-z0-9.-]+)+$/;

export type ModulePath = t.TypeOf<typeof ModulePath>;
export const ModulePath = t.brand(
    t.string,
    (s): s is t.Branded<string, ModulePathBrand> => modulePathRegex.test(s),
    'ModulePath',
);
export interface ModulePathBrand {
    readonly ModulePath: unique symbol;
}


const templateModuleKindRegex = /^template\/[a-z0-9/-]$/;

export type TemplateModuleKind = t.TypeOf<typeof TemplateModuleKind>;
export const TemplateModuleKind = t.brand(
    t.string,
    (s): s is t.Branded<string, TemplateModuleKindBrand> => templateModuleKindRegex.test(s),
    'TemplateModuleKind',
);
export interface TemplateModuleKindBrand {
    readonly TemplateModuleKind: unique symbol;
}


const paramNameRegex = /^[a-zA-Z0-9-]+$/;

export type ParamName = t.TypeOf<typeof ParamName>;
export const ParamName = t.brand(
    t.string,
    (s): s is t.Branded<string, ParamNameBrand> => paramNameRegex.test(s),
    'ParamName',
);
export interface ParamNameBrand {
    readonly ParamName: unique symbol;
}


export type DependencyName = t.TypeOf<typeof DependencyName>;
export const DependencyName = t.brand(
    t.string,
    (s): s is t.Branded<string, DependencyNameBrand> => paramNameRegex.test(s),
    'DependencyName',
);
export interface DependencyNameBrand extends ParamNameBrand {
    readonly DependencyName: unique symbol;
}


const versionNameRegex = /^(?:0|[1-9]\d*)(?:\.(?:0|[1-9]\d*)){0,2}(?:-[a-zA-Z0-9-]+)?$/;

export type VersionName = t.TypeOf<typeof VersionName>;
export const VersionName = t.brand(
    t.string,
    (s): s is t.Branded<string, VersionNameBrand> => versionNameRegex.test(s),
    'VersionName',
);
export interface VersionNameBrand {
    readonly VersionName: unique symbol;
}
