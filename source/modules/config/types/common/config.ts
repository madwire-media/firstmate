/* eslint-disable @typescript-eslint/no-use-before-define */
import * as t from 'io-ts';
import { map, set } from './other';
import { AnyPath } from './firstmate';
import {
    ParamName, ModulePath, DependencyName, ProfileGlobName, ProfileName,
} from './config-names';
import { interpolated } from './interpolated-string';

export type Params = t.TypeOf<typeof Params>;
export const Params = map(ParamName, t.string, 'Params');

export type InterpolatedParams = t.TypeOf<typeof InterpolatedParams>;
export const InterpolatedParams = map(ParamName, interpolated(t.string), 'InterpolatedParams');

export type RequiredParams = t.TypeOf<typeof RequiredParams>;
export const RequiredParams = set(ParamName, 'RequiredParams');

export type VersionLockedRole = t.TypeOf<typeof VersionLockedRole>;
export const VersionLockedRole = t.keyof({
    publish: true,
    run: true,
});

export type Dependency = t.TypeOf<typeof Dependency>;
export const Dependency = t.intersection([
    t.type({
        module: ModulePath,
    }),
    t.partial({
        params: Params,
        versionLockedRole: VersionLockedRole,
    }),
], 'Dependency');

export type InterpolatedDependency = t.TypeOf<typeof InterpolatedDependency>;
export const InterpolatedDependency = t.intersection([
    t.type({
        module: ModulePath,
    }),
    t.partial({
        params: InterpolatedParams,
        versionLockedRole: VersionLockedRole,
    }),
]);

export type Dependencies = t.TypeOf<typeof Dependencies>;
export const Dependencies = map(DependencyName, t.union([
    ModulePath,
    Dependency,
]), 'Dependencies');

export type InterpolatedDependencies = t.TypeOf<typeof InterpolatedDependencies>;
export const InterpolatedDependencies = map(DependencyName, t.union([
    ModulePath,
    InterpolatedDependency,
]), 'InterpolatedDependencies');

export type InterpolatedCopyFiles = t.TypeOf<typeof InterpolatedCopyFiles>;
export const InterpolatedCopyFiles = map(
    interpolated(AnyPath),
    interpolated(AnyPath),
    'InterpolatedCopyFiles',
);

export type CopyFiles = t.TypeOf<typeof CopyFiles>;
export const CopyFiles = map(AnyPath, AnyPath, 'CopyFiles');

export type InterpolatedModuleOutputs = t.TypeOf<typeof InterpolatedModuleOutputs>;
export const InterpolatedModuleOutputs = map(
    ParamName,
    interpolated(t.string),
    'InterpolatedModuleOutputs',
);

export type BaseModuleProfile = t.TypeOf<typeof BaseModuleProfile>;
export const BaseModuleProfile = t.partial({
    // No defaultParams or requiredParams because they are not valid on root modules
    steps: InterpolatedDependencies,
    extendsProfile: ProfileGlobName,
}, 'BaseModuleProfile');

export type BaseModule = t.TypeOf<typeof BaseModule>;
export const BaseModule = t.intersection([
    t.type({
        kind: t.string,
        description: t.string,
    }),
    t.partial({
        profileTemplates: map(ProfileName, BaseModuleProfile),
        profiles: map(ProfileGlobName, BaseModuleProfile),
    }),
], 'BaseModule');

export interface ModuleTypes<
    M extends BaseModule,
    P extends BaseModuleProfile,
    IS extends boolean,
> {
    moduleType: M;
    profileType: P;
    isSource: IS;
}
