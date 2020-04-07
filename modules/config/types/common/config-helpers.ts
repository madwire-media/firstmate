import t from 'io-ts';
import { map } from './other';
import { BranchName } from './git';
import {
    ProfileName, Params, RequiredParams, Dependencies,
} from './config';


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
            steps: Dependencies,
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
            steps: Dependencies,
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
    profilePartials: PP,
) {
    const profileType = t.intersection([
        t.partial({
            steps: Dependencies,
            extendsProfile: ProfileName,
            defaultParams: Params,
            requiredParams: RequiredParams,
        }),
        profilePartials,
    ], `${typeName}PartialProfile`);

    return t.intersection([
        t.type({
            kind,
            description: t.string,
        }),
        t.partial({
            profiles: map(ProfileName, profileType),
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
    profilePartials: PP,
) {
    const profileType = t.intersection([
        t.partial({
            steps: Dependencies,
            extendsProfile: ProfileName,
        }),
        profilePartials,
    ], `${typeName}PartialProfile`);

    return t.intersection([
        t.type({
            kind,
            description: t.string,
        }),
        t.partial({
            profiles: map(ProfileName, profileType),
        }),
        rootProps,
    ], typeName);
}
