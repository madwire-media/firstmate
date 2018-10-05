import { stringifyProps } from '../helpers/transform';
import * as dockerDeployment from '../serviceTypes/dockerDeployment/module';

import { makeError, mergeValues, parseBaseAnyBranch, resolveBranch } from './helpers';
import { ConfigBranch, ConfigBranchBase, ConfigContext } from './types';

export function parseDockerDeploymentBranches(context: ConfigContext,
                                              data: {[branchName: string]: ConfigBranch},
): {[branchName: string]: dockerDeployment.Branch} {
    const branches: {[branchName: string]: dockerDeployment.Branch} = {};

    // JSON schema already checks branch names

    for (const branchName in data) {
        const rawBranch = resolveBranch(context, data, branchName);
        const branchContext = {...context, branchName};

        branchContext.copyFiles = rawBranch.copyFiles || branchContext.copyFiles;
        branchContext.dependsOn = rawBranch.dependsOn || branchContext.dependsOn;

        branchContext.version = rawBranch.version || branchContext.version;
        branchContext.registry = rawBranch.registry || branchContext.registry;
        branchContext.cluster = rawBranch.cluster || branchContext.cluster;
        branchContext.namespace = rawBranch.namespace || branchContext.namespace;
        branchContext.imageNamePrefix = rawBranch.imageNamePrefix || branchContext.imageNamePrefix;
        branchContext.chartmuseum = rawBranch.chartmuseum || branchContext.chartmuseum;
        branchContext.releaseName = rawBranch.releaseName || branchContext.releaseName;
        branchContext.recreatePods = rawBranch.recreatePods || branchContext.recreatePods;

        branchContext.containers = mergeValues(rawBranch.containers, branchContext.containers);
        branchContext.helmArgs = mergeValues(rawBranch.helmArgs, branchContext.helmArgs);

        let dev;
        let stage;
        let prod;
        const allowedModes = rawBranch.allowedModes || ['dev', 'stage', 'prod'];

        if (allowedModes.includes('dev')) {
            dev = parseDockerDeploymentDevBranch(branchContext, rawBranch.dev);
        }
        if (allowedModes.includes('stage')) {
            stage = parseDockerDeploymentStageBranch(branchContext, rawBranch.stage);
        }
        if (allowedModes.includes('prod')) {
            prod = parseDockerDeploymentProdBranch(branchContext, rawBranch.prod);
        }

        dev = parseBaseAnyBranch(branchContext, dev, rawBranch.dev);
        stage = parseBaseAnyBranch(branchContext, stage, rawBranch.stage);
        prod = parseBaseAnyBranch(branchContext, prod, rawBranch.prod);

        branches[branchName] = {...new dockerDeployment.Branch(), dev, stage, prod};
    }

    if (!('~default' in branches)) {
        throw makeError(context, "'~default' branch is missing");
    }

    return branches;
}

function parseDockerDeploymentDevBranch(context: ConfigContext,
                                        data?: ConfigBranchBase,
): dockerDeployment.DevBranch {
    let {registry, cluster, namespace, imageNamePrefix, containers,
        helmArgs, releaseName, recreatePods, mode, pushDebugContainer, autodelete,
    } = context;

    if (data !== undefined) {
        registry = data.registry || registry;
        cluster = data.cluster || cluster;
        namespace = data.namespace || namespace;
        imageNamePrefix = data.imageNamePrefix || imageNamePrefix;
        releaseName = data.releaseName || releaseName;
        recreatePods = data.recreatePods || recreatePods;
        mode = data.mode || mode;
        pushDebugContainer = data.pushDebugContainer || pushDebugContainer;
        autodelete = data.autodelete || autodelete;

        helmArgs = mergeValues(data.helmArgs, helmArgs);
        containers = mergeValues(data.containers, containers);

        if (containers === undefined) {
            containers = data.containers;
        } else if (data.containers !== undefined) {
            for (const newContainerName in data.containers) {
                containers[newContainerName] = data.containers[newContainerName];
            }
        }
    }

    if (registry === undefined) {
        throw makeError(context, "'registry' is undefined", 'dev');
    }
    if (cluster === undefined) {
        throw makeError(context, "'cluster' is undefined", 'dev');
    }
    if (namespace === undefined) {
        throw makeError(context, "'namespace' is undefined", 'dev');
    }
    if (mode !== undefined && mode !== 'proxy' && mode !== 'local') {
        throw makeError(context, "'mode' is not 'proxy' or 'local'", 'dev');
    }

    return new dockerDeployment.DevBranch({
        registry,
        cluster,
        namespace,
        imageNamePrefix,
        containers,
        mode,
        pushDebugContainer,
        autodelete,
        helmArgs: helmArgs && stringifyProps(helmArgs),
        releaseName,
        recreatePods,
    });
}
function parseDockerDeploymentStageBranch(context: ConfigContext,
                                          data?: ConfigBranchBase,
): dockerDeployment.StageBranch {
    let {registry, cluster, namespace, imageNamePrefix, containers, helmArgs, releaseName, recreatePods} = context;

    if (data !== undefined) {
        registry = data.registry || registry;
        cluster = data.cluster || cluster;
        namespace = data.namespace || namespace;
        imageNamePrefix = data.imageNamePrefix || imageNamePrefix;
        releaseName = data.releaseName || releaseName;
        recreatePods = data.recreatePods || recreatePods;

        helmArgs = mergeValues(data.helmArgs, helmArgs);
        containers = mergeValues(data.containers, containers);

        if (containers === undefined) {
            containers = data.containers;
        } else if (data.containers !== undefined) {
            for (const newContainerName in data.containers) {
                containers[newContainerName] = data.containers[newContainerName];
            }
        }
    }

    if (registry === undefined) {
        throw makeError(context, "'registry' is undefined", 'stage');
    }
    if (cluster === undefined) {
        throw makeError(context, "'cluster', is undefined", 'stage');
    }
    if (namespace === undefined) {
        throw makeError(context, "'namespace' is undefined", 'stage');
    }

    return new dockerDeployment.StageBranch({
        registry,
        cluster,
        namespace,
        imageNamePrefix,
        containers,
        helmArgs: helmArgs && stringifyProps(helmArgs),
        releaseName,
        recreatePods,
    });
}
function parseDockerDeploymentProdBranch(context: ConfigContext,
                                         data?: ConfigBranchBase,
): dockerDeployment.ProdBranch {
    let {
        registry, cluster, namespace, imageNamePrefix, containers,
        helmArgs, chartmuseum, releaseName, version,
    } = context;

    if (data !== undefined) {
        registry = data.registry || registry;
        cluster = data.cluster || cluster;
        namespace = data.namespace || namespace;
        imageNamePrefix = data.imageNamePrefix || imageNamePrefix;
        chartmuseum = data.chartmuseum || chartmuseum;
        releaseName = data.releaseName || releaseName;
        version = data.version || version;

        helmArgs = mergeValues(data.helmArgs, helmArgs);
        containers = mergeValues(data.containers, containers);

        if (containers === undefined) {
            containers = data.containers;
        } else if (data.containers !== undefined) {
            for (const newContainerName in data.containers) {
                containers[newContainerName] = data.containers[newContainerName];
            }
        }
    }

    if (registry === undefined) {
        throw makeError(context, "'registry' is undefined", 'prod');
    }
    if (cluster === undefined) {
        throw makeError(context, "'cluster' is undefined", 'prod');
    }
    if (namespace === undefined) {
        throw makeError(context, "'namespace' is undefined", 'prod');
    }
    if (chartmuseum === undefined) {
        throw makeError(context, "'chartmuseum' is undefined", 'prod');
    }
    if (version === undefined) {
        throw makeError(context, "'version' is undefined", 'prod');
    }

    return new dockerDeployment.ProdBranch({
        registry,
        cluster,
        namespace,
        imageNamePrefix,
        containers,
        version,
        helmArgs: helmArgs && stringifyProps(helmArgs),
        releaseName,
        chartmuseum,
    });
}
