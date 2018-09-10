import { stringifyProps } from '../helpers/transform';
import * as buildContainer from '../serviceTypes/buildContainer/module';

import { makeError, parseBaseAnyBranch, resolveBranch } from './helpers';
import { ConfigBranch, ConfigBranchBase, ConfigContext } from './types';

export function parseBuildContainerBranches(context: ConfigContext,
                                            data: {[branchName: string]: ConfigBranch},
): {[BranchName: string]: buildContainer.Branch} {
    const branches: {[branchName: string]: buildContainer.Branch} = {};

    // JSON schema already checks branch names

    for (const branchName in data) {
        const rawBranch = resolveBranch(context, data, branchName);
        const branchContext = {...context, branchName};

        branchContext.copyFiles = rawBranch.copyFiles || branchContext.copyFiles;
        branchContext.dependsOn = rawBranch.dependsOn || branchContext.dependsOn;
        branchContext.version = rawBranch.version || branchContext.version;
        branchContext.volumes = rawBranch.volumes || branchContext.volumes;
        branchContext.dockerArgs = rawBranch.dockerArgs || branchContext.dockerArgs;

        let dev;
        let stage;
        let prod;
        const allowedModes = rawBranch.allowedModes || ['dev', 'stage', 'prod'];

        if (allowedModes.includes('dev')) {
            dev = parseBuildContainerDevBranch(branchContext, rawBranch.dev);
        }
        if (allowedModes.includes('stage')) {
            stage = parseBuildContainerStageBranch(branchContext, rawBranch.stage);
        }
        if (allowedModes.includes('prod')) {
            prod = parseBuildContainerProdBranch(branchContext, rawBranch.prod);
        }

        dev = parseBaseAnyBranch(branchContext, dev, rawBranch.dev);
        stage = parseBaseAnyBranch(branchContext, stage, rawBranch.stage);
        prod = parseBaseAnyBranch(branchContext, prod, rawBranch.prod);

        branches[branchName] = {...new buildContainer.Branch(), dev, stage, prod};
    }

    if (!('~default' in branches)) {
        throw makeError(context, "'~default' branch is missing");
    }

    return branches;
}

function parseBuildContainerDevBranch(context: ConfigContext,
                                      data?: ConfigBranchBase,
): buildContainer.DevBranch {
    let {volumes, dockerArgs} = context;

    if (data !== undefined) {
        volumes = data.volumes || volumes;
        dockerArgs = data.dockerArgs || dockerArgs;
    }

    return new buildContainer.DevBranch({
        volumes,
        dockerArgs: dockerArgs && stringifyProps(dockerArgs),
    });
}
function parseBuildContainerStageBranch(context: ConfigContext,
                                        data?: ConfigBranchBase,
): buildContainer.StageBranch {
    let {volumes, dockerArgs} = context;

    if (data !== undefined) {
        volumes = data.volumes || volumes;
        dockerArgs = data.dockerArgs || dockerArgs;
    }

    return new buildContainer.StageBranch({
        volumes,
        dockerArgs: dockerArgs && stringifyProps(dockerArgs),
    });
}
function parseBuildContainerProdBranch(context: ConfigContext,
                                       data?: ConfigBranchBase,
): buildContainer.ProdBranch {
    let {volumes, version, dockerArgs} = context;

    if (data !== undefined) {
        volumes = data.volumes || volumes;
        version = data.version || version;
        dockerArgs = data.dockerArgs || dockerArgs;
    }

    if (version === undefined) {
        throw makeError(context, "'version' is undefined", 'prod');
    }

    return new buildContainer.ProdBranch({
        volumes,
        version,
        dockerArgs: dockerArgs && stringifyProps(dockerArgs),
    });
}
