import t from 'io-ts';
import { map } from './other';
import { BranchName } from './git';
import { ProfileName } from './firstmate';
import { interpolated } from './interpolated-string';
import { Params, RequiredParams } from './config';


export function createBranches<
    B extends t.Type<unknown, unknown>,
>(
    branchType: B,
    name = `Branches<${branchType.name}>`,
) {
    return map(BranchName, branchType, name);
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
    const branchType = t.intersection([
        t.type({
            version: interpolated(t.string),
        }),
        t.partial({
            profiles: map(ProfileName, profileProps, `${typeName}Profile`),
        }),
        profileProps,
    ], `${typeName}Branch`);

    const commonRootType = t.intersection([
        t.type({
            kind: t.literal(kind),
            description: t.string,
        }),
        t.partial({
            defaultParams: Params,
            requiredParams: RequiredParams,
            branches: map(BranchName, branchType),
        }),
    ], typeName);

    return t.intersection([
        commonRootType,
        rootProps,
    ], typeName);
}
