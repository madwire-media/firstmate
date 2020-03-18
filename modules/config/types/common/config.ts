/* eslint-disable @typescript-eslint/no-use-before-define */
import t from 'io-ts';
import { map, set } from './other';
import { BranchName } from './git';
// eslint-disable-next-line import/no-cycle
import { ProfileName, ModulePath, ServicePath } from './firstmate';

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

export type ModuleDependency = t.TypeOf<typeof ModuleDependency>;
export const ModuleDependency = t.type({
    module: ModulePath,
    params: Params,
}, 'ModuleDependency');

export type ServiceDependency = t.TypeOf<typeof ServiceDependency>;
export const ServiceDependency = t.type({
    service: ServicePath,
    params: Params,
});

export type Dependency = t.TypeOf<typeof Dependency>;
export const Dependency = t.union([
    ModuleDependency,
    ServiceDependency,
], 'Dependency');

export function createBranches<
    B extends t.Type<unknown, unknown>,
>(
    branchType: B,
    name = `Branches<${branchType.name}>`,
) {
    return map(BranchName, branchType, name);
}

export function createServiceOrModule<
    K extends string,
    RP extends t.Mixed,
    PP extends t.Mixed,
>(
    typeName: string,
    kind: K,
    rootProps: RP,
    profileProps: PP,
) {
    const branchType = t.intersection([
        t.type({
            version: t.string,
            profiles: map(ProfileName, profileProps, `${typeName}Profile`),
        }),
        profileProps,
    ], `${typeName}Branch`);

    const commonRootType = t.type({
        kind: t.literal(kind),
        description: t.string,
        defaultParams: Params,
        requiredParams: RequiredParams,
        branches: branchType,
    }, typeName);

    return t.intersection([
        commonRootType,
        rootProps,
    ], typeName);
}
