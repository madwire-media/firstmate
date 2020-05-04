import * as t from 'io-ts';
import { map } from './other';
import { BranchName } from './git';
import { Params, RequiredParams, InterpolatedDependencies } from './config';
import { ProfileGlobName, ProfileName } from './config-names';


export function createBranches<
    B extends t.Type<unknown, unknown>,
>(
    branchType: B,
    name = `Branches<${branchType.name}>`,
) {
    return map(BranchName, branchType, name);
}

export interface ModuleOptions {
    noParams?: boolean;
}

export function createModuleProfile<PP extends t.Mixed>(
    typeName: string,
    profileProps: PP,
) {
    return t.intersection([
        t.partial({
            steps: InterpolatedDependencies,
            defaultParams: Params,
            requiredParams: RequiredParams,
        }),
        profileProps,
    ], `${typeName}PartialProfile`);
}

export function createRootModuleProfile<PP extends t.Mixed>(
    typeName: string,
    profileProps: PP,
) {
    return t.intersection([
        t.partial({
            steps: InterpolatedDependencies,
        }),
        profileProps,
    ], `${typeName}PartialProfile`);
}

export function createModule<
    K extends string,
    RP extends t.Mixed,
    PP extends t.Mixed,
>(
    typeName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kind: t.Type<K, any>,
    rootProps: RP,
    profileProps: PP,
) {
    const profileType = t.intersection([
        t.partial({
            steps: InterpolatedDependencies,
            extendsProfile: ProfileGlobName,
            defaultParams: Params,
            requiredParams: RequiredParams,
        }),
        profileProps,
    ], `${typeName}PartialProfile`);

    return t.intersection([
        t.type({
            kind,
            description: t.string,
        }),
        t.partial({
            profileTemplates: map(ProfileName, profileType),
            profiles: map(ProfileGlobName, profileType),
        }),
        rootProps,
    ], typeName);
}

export function createRootModule<
    K extends string,
    RP extends t.Mixed,
    PP extends t.Mixed,
>(
    typeName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    kind: t.Type<K, any>,
    rootProps: RP,
    profileProps: PP,
) {
    const profileType = t.intersection([
        t.partial({
            steps: InterpolatedDependencies,
            extendsProfile: ProfileGlobName,
        }),
        profileProps,
    ], `${typeName}PartialProfile`);

    return t.intersection([
        t.type({
            kind,
            description: t.string,
        }),
        t.partial({
            profileTemplates: map(ProfileName, profileType),
            profiles: map(ProfileGlobName, profileType),
        }),
        rootProps,
    ], typeName);
}
