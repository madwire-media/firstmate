import { Result } from '@madwire-media/result';
import { mergeProfiles } from './merge-profiles';
import { ValidationError } from '../../common/validationError';
import { BaseModule, BaseModuleProfile } from '../types/common/config';
import { ProfileName } from '../types/common/config-names';
import { matchProfileName } from './match-profile';
import { walkProfiles } from './walk-profiles';

export function computeProfile(
    module: BaseModule,
    profileName: ProfileName,
): Result<BaseModuleProfile | undefined, Error | ValidationError> {
    if (module.profiles === undefined) {
        return Result.Ok(undefined);
    }

    const matchedRootProfile = matchProfileName(module.profiles.keys(), profileName);

    if (matchedRootProfile === undefined) {
        return Result.Err(new Error(
            `No configured profiles matched '${profileName}'`,
        ));
    }

    const usedProfiles: BaseModuleProfile[] = [];

    walkProfiles(module, matchedRootProfile, (_name, profile) => {
        usedProfiles.push(profile);
    }).try();

    const mergedProfile = mergeProfiles(usedProfiles);

    return Result.Ok(mergedProfile);
}
