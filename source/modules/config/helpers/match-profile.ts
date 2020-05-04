import { ProfileName, ProfileGlobName } from '../types/common/config-names';

export function matchProfileName(
    profiles: Iterable<ProfileGlobName> | ArrayLike<ProfileGlobName>,
    profileName: ProfileName,
): ProfileGlobName | undefined {
    const profileGlobs = Array.from(profiles).sort(
        (a, b) => b.length - a.length,
    );

    for (const profileGlob of profileGlobs) {
        if (profileGlob.endsWith('*')) {
            const matchLength = profileGlob.length - 1;

            if (profileGlob.substr(0, matchLength) === profileName.substr(0, matchLength)) {
                return profileGlob;
            }
        } else if (profileGlob === profileName) {
            return profileGlob;
        }
    }

    return undefined;
}
