
import * as semver from 'semver';

import { Config } from '../config';
import { ConfiguredDependency } from '../config/types/other';
import { a } from '../helpers/cli';
import { saveConfig } from '../helpers/config';
import { maybeTryBranch, resolveBranchName, SigIntHandler } from '../helpers/service';
import { VersionChange, VersionChangeKind } from '../main';

export function setVersionConfig(
    config: Config,
    rawConfig: [{}, string, boolean],
    serviceName: string,
    branchName: string,
    alreadyRunBranches: Set<string | ConfiguredDependency>,
    params: {[arg: string]: any},
    context: any,
): boolean {
    const service = config.services[serviceName];

    const usedBranchName = resolveBranchName(branchName, service.branches);
    const branchBase = service.branches[usedBranchName];

    if (branchBase[params.mode as 'dev' | 'stage' | 'prod'] === undefined) {
        console.error(a`\{lr Cannot set version of service \{lw ${serviceName}\} on ${''
            }branch \{lg ${usedBranchName}\} in \{c ${params.mode}\} mode`);
        maybeTryBranch(service, usedBranchName, 'prod');
        return false;
    }
    const branch = branchBase[params.mode as 'dev' | 'stage' | 'prod']!;

    if (params.version !== undefined) {
        const versionChange = params.version as VersionChange<VersionChangeKind>;
        let version: string | null = branch.version;

        switch (versionChange.kind) {
            case VersionChangeKind.major:
                version = semver.inc(version, 'major');
                break;

            case VersionChangeKind.minor:
                version = semver.inc(version, 'minor');
                break;

            case VersionChangeKind.patch:
                version = semver.inc(version, 'patch');
                break;

            case VersionChangeKind.prerelease:
                version = semver.inc(version, 'prerelease');
                break;

            case VersionChangeKind.tag:
                const coerced = semver.coerce(version);

                if (coerced === null) {
                    version = null;
                } else {
                    version = `${coerced.version}-${versionChange.value!.substr(1)}`;
                }
                break;

            case VersionChangeKind.value:
                version = versionChange.value!;
                break;
        }

        if (version === null) {
            console.error(a`\{lr Version \{g ${branch.version}\} is not a valid semver version number\}`);
        } else {
            branch.version = version;
            saveConfig(rawConfig, context);
        }
    }

    return true;
}

export function setVersionReqs(): boolean {
    return true;
}

export async function setVersion(): Promise<undefined | false> {
    return undefined;
}
