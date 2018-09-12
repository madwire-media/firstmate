import { stringifyProps } from '../helpers/transform';
import * as dockerImage from '../serviceTypes/dockerImage/module';

import { makeError, mergeValues, parseBaseAnyBranch, resolveBranch } from './helpers';
import { ConfigBranch, ConfigBranchBase, ConfigContext } from './types';

export function parseDockerImageBranches(context: ConfigContext,
                                         data: {[branchName: string]: ConfigBranch},
): {[branchName: string]: dockerImage.Branch} {
    const branches: {[branchName: string]: dockerImage.Branch} = {};

    // JSON schema already checks branch names

    for (const branchName in data) {
        const rawBranch = resolveBranch(context, data, branchName);
        const branchContext = {...context, branchName};

        branchContext.copyFiles = rawBranch.copyFiles || branchContext.copyFiles;
        branchContext.dependsOn = rawBranch.dependsOn || branchContext.dependsOn;

        branchContext.version = rawBranch.version || branchContext.version;
        branchContext.registry = rawBranch.registry || branchContext.registry;
        branchContext.imageName = rawBranch.imageName || branchContext.imageName;
        branchContext.pushImage = rawBranch.pushImage || branchContext.pushImage;

        branchContext.dockerArgs = mergeValues(rawBranch.dockerArgs, branchContext.dockerArgs);

        let dev: dockerImage.DevBranch | undefined;
        let stage: dockerImage.StageBranch | undefined;
        let prod: dockerImage.ProdBranch | undefined;
        const allowedModes = rawBranch.allowedModes || ['dev', 'stage', 'prod'];

        if (allowedModes.includes('dev')) {
            dev = parseDockerImageDevBranch(branchContext, rawBranch.dev);
        }
        if (allowedModes.includes('stage')) {
            stage = parseDockerImageStageBranch(branchContext, rawBranch.stage);
        }
        if (allowedModes.includes('prod')) {
            prod = parseDockerImageProdBranch(branchContext, rawBranch.prod);
        }

        dev = parseBaseAnyBranch(branchContext, dev, rawBranch.dev);
        stage = parseBaseAnyBranch(branchContext, stage, rawBranch.stage);
        prod = parseBaseAnyBranch(branchContext, prod, rawBranch.prod);

        branches[branchName] = {...new dockerImage.Branch(), dev, stage, prod};
    }

    if (!('~default' in branches)) {
        throw makeError(context, "'~default' branch is missing");
    }

    return branches;
}

function parseDockerImageDevBranch(context: ConfigContext, data?: ConfigBranchBase): dockerImage.DevBranch {
    let {registry, imageName, dockerArgs, pushImage} = context;

    if (data !== undefined) {
        registry = data.registry || registry;
        imageName = data.imageName || imageName;
        pushImage = data.pushImage || pushImage;

        dockerArgs = mergeValues(data.dockerArgs, dockerArgs);
    }

    if (registry === undefined) {
        throw makeError(context, "'registry' is undefined", 'dev');
    }
    if (imageName === undefined) {
        throw makeError(context, "'imageName' is undefined", 'dev');
    }

    return new dockerImage.DevBranch({
        registry,
        imageName,
        dockerArgs: dockerArgs && stringifyProps(dockerArgs),
        pushImage,
    });
}
function parseDockerImageStageBranch(context: ConfigContext, data?: ConfigBranchBase): dockerImage.StageBranch {
    let {registry, imageName, dockerArgs, pushImage} = context;

    if (data !== undefined) {
        registry = data.registry || registry;
        imageName = data.imageName || imageName;
        pushImage = data.pushImage || pushImage;

        dockerArgs = mergeValues(data.dockerArgs, dockerArgs);
    }

    if (registry === undefined) {
        throw makeError(context, "'registry' is undefined", 'stage');
    }
    if (imageName === undefined) {
        throw makeError(context, "'imageName' is undefined", 'stage');
    }

    return new dockerImage.StageBranch({
        registry,
        imageName,
        dockerArgs: dockerArgs && stringifyProps(dockerArgs),
        pushImage,
    });
}
function parseDockerImageProdBranch(context: ConfigContext, data?: ConfigBranchBase): dockerImage.ProdBranch {
    let {registry, imageName, version, dockerArgs} = context;

    if (data !== undefined) {
        registry = data.registry || registry;
        imageName = data.imageName || imageName;
        version = data.version || version;

        dockerArgs = mergeValues(data.dockerArgs, dockerArgs);
    }

    if (registry === undefined) {
        throw makeError(context, "'registry' is undefined", 'prod');
    }
    if (imageName === undefined) {
        throw makeError(context, "'imageName' is undefined", 'prod');
    }
    if (version === undefined) {
        throw makeError(context, "'version' is undefined", 'prod');
    }

    return new dockerImage.ProdBranch({
        registry,
        imageName,
        version,
        dockerArgs: dockerArgs && stringifyProps(dockerArgs),
    });
}
