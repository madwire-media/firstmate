/* eslint-disable @typescript-eslint/no-use-before-define */
import t from 'io-ts';
import { map, set } from './other';

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


const paramNameRegex = /^[a-zA-Z]+$/;

export type ParamName = t.TypeOf<typeof ParamName>;
export const ParamName = t.brand(
    t.string,
    (s): s is t.Branded<string, ParamNameBrand> => paramNameRegex.test(s),
    'ParamName',
);
export interface ParamNameBrand {
    readonly ParamName: unique symbol;
}


export type Params = t.TypeOf<typeof Params>;
export const Params = map(ParamName, t.string, 'Params');

export type RequiredParams = t.TypeOf<typeof RequiredParams>;
export const RequiredParams = set(ParamName, 'RequiredParams');

export type DependencyName = t.TypeOf<typeof DependencyName>;
export const DependencyName = t.brand(
    t.string,
    (s): s is t.Branded<string, DependencyNameBrand> => paramNameRegex.test(s),
    'DependencyName',
);
export interface DependencyNameBrand extends ParamNameBrand {
    readonly DependencyName: unique symbol;
}

export type Dependency = t.TypeOf<typeof Dependency>;
export const Dependency = t.type({
    module: ModulePath,
    params: Params,
}, 'Dependency');

export type Dependencies = t.TypeOf<typeof Dependencies>;
export const Dependencies = map(DependencyName, t.union([
    ModulePath,
    Dependency,
]), 'Dependencies');

export type BaseModuleProfile = t.TypeOf<typeof BaseModuleProfile>;
export const BaseModuleProfile = t.partial({
    // No defaultParams or requiredParams because they are not valid on root modules
    steps: Dependencies,
    extendsProfile: ProfileName,
});

export type BaseModule = t.TypeOf<typeof BaseModule>;
export const BaseModule = t.intersection([
    t.type({
        kind: t.string,
        description: t.string,
    }),
    t.partial({
        profiles: map(ProfileName, BaseModuleProfile),
    }),
], 'BaseModule');
