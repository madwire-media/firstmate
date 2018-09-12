import { stringifyProps } from '../helpers/transform';
import * as pureHelm from '../serviceTypes/pureHelm/module';

import { makeError, parseBaseAnyBranch, resolveBranch } from './helpers';
import { ConfigBranch, ConfigBranchBase, ConfigContext } from './types';

export function parsePureHelmBranches(context: ConfigContext,
                                      data: {[branchName: string]: ConfigBranch},
): {[branchName: string]: pureHelm.Branch} {
    const branches: {[branchname: string]: pureHelm.Branch} = {};

    // JSON schema laready checks branch names

    for (const branchName in data) {
        const rawBranch = resolveBranch(context, data, branchName);
        const branchContext = {...context, branchName};

        branchContext.copyFiles = rawBranch.copyFiles || branchContext.copyFiles;
        branchContext.dependsOn = rawBranch.dependsOn || branchContext.dependsOn;
        branchContext.version = rawBranch.version || branchContext.version;
        branchContext.cluster = rawBranch.cluster || branchContext.cluster;
        branchContext.namespace = rawBranch.namespace || branchContext.namespace;
        branchContext.chartmuseum = rawBranch.chartmuseum || branchContext.chartmuseum;

        let dev;
        let stage;
        let prod;
        const allowedModes = rawBranch.allowedModes || ['dev', 'stage', 'prod'];

        if (allowedModes.includes('dev')) {
            dev = parsePureHelmDevBranch(branchContext, rawBranch.dev);
        }
        if (allowedModes.includes('stage')) {
            stage = parsePureHelmStageBranch(branchContext, rawBranch.stage);
        }
        if (allowedModes.includes('prod')) {
            prod = parsePureHelmProdBranch(branchContext, rawBranch.prod);
        }

        dev = parseBaseAnyBranch(branchContext, dev, rawBranch.dev);
        stage = parseBaseAnyBranch(branchContext, stage, rawBranch.stage);
        prod = parseBaseAnyBranch(branchContext, prod, rawBranch.prod);

        branches[branchName] = {...new pureHelm.Branch(), dev, stage, prod};
    }

    if (!('~default' in branches)) {
        throw makeError(context, "'~default' branch is missing");
    }

    return branches;
}

function parsePureHelmDevBranch(context: ConfigContext, data?: ConfigBranchBase): pureHelm.DevBranch {
    let {cluster, namespace, helmArgs, releaseName, recreatePods} = context;

    if (data !== undefined) {
        cluster = data.cluster || cluster;
        namespace = data.namespace || namespace;
        helmArgs = data.helmArgs || helmArgs;
        releaseName = data.releaseName || releaseName;
        recreatePods = data.recreatePods || recreatePods;
    }

    if (cluster === undefined) {
        throw makeError(context, "'cluster' is undefined", 'dev');
    }
    if (namespace === undefined) {
        throw makeError(context, "'namespace' is undefined", 'dev');
    }

    return new pureHelm.DevBranch({
        cluster,
        namespace,
        helmArgs: helmArgs && stringifyProps(helmArgs),
        releaseName,
        recreatePods,
    });
}
function parsePureHelmStageBranch(context: ConfigContext, data?: ConfigBranchBase): pureHelm.StageBranch {
    let {cluster, namespace, helmArgs, releaseName, recreatePods} = context;

    if (data !== undefined) {
        cluster = data.cluster || cluster;
        namespace = data.namespace || namespace;
        helmArgs = data.helmArgs || helmArgs;
        releaseName = data.releaseName || releaseName;
        recreatePods = data.recreatePods || recreatePods;
    }

    if (cluster === undefined) {
        throw makeError(context, "'cluster' is undefined", 'stage');
    }
    if (namespace === undefined) {
        throw makeError(context, "'namespace' is undefined", 'stage');
    }

    return new pureHelm.StageBranch({
        cluster,
        namespace,
        helmArgs: helmArgs && stringifyProps(helmArgs),
        releaseName,
        recreatePods,
    });
}
function parsePureHelmProdBranch(context: ConfigContext, data?: ConfigBranchBase): pureHelm.ProdBranch {
    let {cluster, namespace, helmArgs, releaseName, chartmuseum, version} = context;

    if (data !== undefined) {
        cluster = data.cluster || cluster;
        namespace = data.namespace || namespace;
        helmArgs = data.helmArgs || helmArgs;
        releaseName = data.releaseName || releaseName;
        chartmuseum = data.chartmuseum || chartmuseum;
        version = data.version || version;
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

    return new pureHelm.ProdBranch({
        cluster,
        namespace,
        helmArgs: helmArgs && stringifyProps(helmArgs),
        releaseName,
        chartmuseum,
        version,
    });
}
