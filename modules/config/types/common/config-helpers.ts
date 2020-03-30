import t from 'io-ts';
import { map } from './other';
import { BranchName } from './git';
import { ProfileName } from './firstmate';
import { Params, RequiredParams } from './config';


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

export function createModule<
    K extends string,
    RP extends t.Mixed,
    PP extends t.Mixed,
>(
    typeName: string,
    kind: K,
    rootProps: RP,
    profileProps: PP,
) {
    const profileType = t.intersection([
        t.partial({
            deps: t.unknown, // TODO: do this
            extendsProfile: ProfileName,
        }),
        profileProps,
    ], `${typeName}Profile`);

    return t.intersection([
        t.type({
            kind: t.literal(kind),
            description: t.string,
        }),
        t.partial({
            extends: t.string, // TODO: replace this with a TemplatePath
            profiles: map(ProfileName, profileType),
            defaultParams: Params,
            requiredParams: RequiredParams,
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
    kind: K,
    rootProps: RP,
    profileProps: PP,
) {
    const profileType = t.intersection([
        t.partial({
            deps: t.unknown, // TODO: do this
            extendsProfile: ProfileName,
        }),
        profileProps,
    ], `${typeName}Profile`);

    return t.intersection([
        t.type({
            kind: t.literal(kind),
            description: t.string,
        }),
        t.partial({
            extends: t.string, // TODO: replace this with a TemplatePath
            profiles: map(ProfileName, profileType),
        }),
        rootProps,
    ], typeName);
}
