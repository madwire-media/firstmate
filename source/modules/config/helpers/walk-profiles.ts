import { Result } from '@madwire-media/result';
import { ProfileGlobName, ProfileName } from '../types/common/config-names';
import { BaseModule } from '../types/common/config';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MapValue<T> = T extends Map<any, infer V> ? V : never;

export function walkProfiles<
    T extends BaseModule,
>(
    module: T,
    profileGlob: ProfileGlobName,
    callback: (name: ProfileGlobName, profile: MapValue<T['profiles']>) => void,
): Result<void, Error> {
    if (module.profiles === undefined) {
        return Result.voidOk;
    }

    const usedProfileNames = new Set<ProfileGlobName>();

    let currentProfileName = profileGlob;
    let currentProfile = module.profiles.get(profileGlob);

    if (currentProfile === undefined) {
        return Result.voidOk;
    }

    callback(currentProfileName, currentProfile as MapValue<T['profiles']>);

    usedProfileNames.add(profileGlob);

    while (currentProfile.extendsProfile !== undefined) {
        if (usedProfileNames.has(currentProfile.extendsProfile)) {
            return Result.Err(new Error(
                `Encountered profile inheritance loop starting from '${currentProfile.extendsProfile}' and looping at '${currentProfileName}'`,
            ));
        }

        let newProfile = module.profiles.get(currentProfile.extendsProfile);

        if (newProfile === undefined && module.profileTemplates !== undefined) {
            newProfile = module.profileTemplates.get(
                currentProfile.extendsProfile as ProfileName,
            );
        }

        if (newProfile === undefined) {
            return Result.Err(new Error(
                `Invalid profile extension by '${currentProfileName}': profile '${currentProfile.extendsProfile}' not found`,
            ));
        }

        currentProfileName = currentProfile.extendsProfile;
        currentProfile = newProfile;

        callback(currentProfileName, currentProfile as MapValue<T['profiles']>);

        usedProfileNames.add(currentProfileName);
    }

    return Result.voidOk;
}
