import { BranchBase, Port } from './serviceTypes/base/branch';
import * as buildContainer from './serviceTypes/buildContainer/module';
import * as dockerDeployment from './serviceTypes/dockerDeployment/module';
import * as dockerImage from './serviceTypes/dockerImage/module';
import * as pureHelm from './serviceTypes/pureHelm/module';

import * as Ajv from 'ajv';
import configSchema = require('../assets/schema.json');

const ajv = new Ajv();
const validateConfig = ajv.compile(configSchema);

export type Service =
    dockerImage.Service |
    dockerDeployment.Service |
    buildContainer.Service |
    pureHelm.Service;
export type Branch =
    dockerImage.Branch |
    dockerDeployment.Branch |
    buildContainer.Branch |
    pureHelm.Branch;

interface ConfigParams {
    project: string;
    defaultService?: string;
    services: {[serviceName: string]: Service};
}

export interface ConfigBase {
    project: string;
    defaultRegistry?: string;
    defaultService?: string;
    services: {[serviceName: string]: ConfigService};
}
export interface ConfigService {
    type: string;
    branches: {[branchName: string]: ConfigBranch};
}
export interface ConfigContainer {
    volumes?: {[source: string]: string};
    k8sVolumes?: {[source: string]: string};
    ports?: Array<number | Port>;
    debugCMD?: string;
}
export interface ConfigBranchBase {
    dependsOn?: string[];
    copyFiles?: {[source: string]: string};
    allowedModes?: Array<'dev' | 'stage' | 'prod'>;
    registry?: string;
    volumes?: {[source: string]: string};
    cluster?: string;
    namespace?: string;
    imageNamePrefix?: string;
    imageName?: string;
    containers?: {[containerName: string]: ConfigContainer};
    mode?: string;
    pushDebugContainer?: boolean;
    version?: string;
    dockerArgs?: {[key: string]: string};
    autodelete?: boolean;
    helmArgs?: {[argName: string]: string};
}
export interface ConfigBranch extends ConfigBranchBase {
    inheritFrom?: string;
    dev?: ConfigBranchBase;
    stage?: ConfigBranchBase;
    prod?: ConfigBranchBase;
}
export interface ConfigContext extends ConfigBranchBase {
    registry?: string;
    serviceName?: string;
    branchName?: string;
}

type ValidationErrors = Ajv.ErrorObject[];

export class Config {
    public static parseRaw(json: {}): Config | ValidationErrors {
        const isValid = validateConfig(json);

        if (!isValid) {
            return validateConfig.errors!;
        }

        const data = json as ConfigBase;
        const context: ConfigContext = {
            registry: data.defaultRegistry,
        };

        const project = data.project;
        const defaultService = data.defaultService;
        const services = parseServices(context, data.services);

        return new Config({
            project,
            defaultService,
            services,
        });
    }

    public project: string;
    public defaultService?: string;
    public services: {[serviceName: string]: Service};

    private constructor(params: ConfigParams) {
        this.project = params.project;
        this.defaultService = params.defaultService;
        this.services = params.services;
    }
}

function makeError(context: ConfigContext, msg: string, env?: string) {
    if (context.serviceName !== undefined) {
        if (context.branchName !== undefined) {
            if (env !== undefined) {
                return new Error(`${msg} on ${env} branch '${context.branchName}' of service '${context.serviceName}'`);
            } else {
                return new Error(`${msg} on branch '${context.branchName}' of service '${context.serviceName}'`);
            }
        } else {
            return new Error(`${msg} on service '${context.serviceName}`);
        }
    } else {
        return new Error(`${msg} on root config object`);
    }
}

function resolveBranch(context: ConfigContext,
                       branches: {[branchName: string]: ConfigBranch},
                       branchName: string,
): ConfigBranch {
    let branch = branches[branchName];
    const travelledBranches: string[] = [];

    while (branch.inheritFrom !== undefined) {
        if (travelledBranches.includes(branch.inheritFrom)) {
            throw makeError({...context, branchName},
                `recursive inheritence to branch '${branch.inheritFrom}'`);
        }
        if (!(branch.inheritFrom in branches)) {
            throw makeError({...context, branchName},
                `cannot inherit from nonexistent branch '${branch.inheritFrom}'`);
        }

        travelledBranches.push(branchName);
        branchName = branch.inheritFrom;
        branch = branches[branchName];
    }

    for (const branchName of travelledBranches) {
        branch = {...branch, ...branches[branchName]};
    }

    return branch;
}

function parseBaseAnyBranch<T extends BranchBase>(context: ConfigContext,
                                                  branch: T | undefined,
                                                  rawBranch: ConfigBranchBase | undefined,
): T | undefined {
    if (branch !== undefined) {
        branch.copyFiles = context.copyFiles;
        branch.dependsOn = context.dependsOn;

        if (rawBranch !== undefined) {
            branch.copyFiles = rawBranch.copyFiles || branch.copyFiles;
            branch.dependsOn = rawBranch.dependsOn || branch.dependsOn;
        }

        return branch;
    }
}

function parseServices(context: ConfigContext,
                       data: {[serviceName: string]: ConfigService},
): {[serviceName: string]: Service} {
    const services: {[serviceName: string]: Service} = {};

    // JSON schema already checks service names

    for (const serviceName in data) {
        const rawService = data[serviceName];
        const serviceContext = {...context, serviceName};

        let service: Service;

        switch (rawService.type) {
            case 'dockerImage':
                service = new dockerImage.Service();
                service.branches = parseDockerImageBranches(serviceContext, rawService.branches);
                break;

            case 'dockerDeployment':
                service = new dockerDeployment.Service();
                service.branches = parseDockerDeploymentBranches(serviceContext, rawService.branches);
                break;

            case 'buildContainer':
                service = new buildContainer.Service();
                service.branches = parseBuildContainerBranches(serviceContext, rawService.branches);
                break;

            case 'pureHelm':
                service = new pureHelm.Service();
                service.branches = parsePureHelmBranches(serviceContext, rawService.branches);
                break;

            default:
                throw new Error(`Reached the unreachable: parsing service ${serviceName}`);
        }

        // Check service's dependsOn properties all exist
        for (const branchName in service.branches) {
            const branch = service.branches[branchName] as any as {[envName: string]: BranchBase | undefined};

            for (const envName of ['dev', 'stage', 'prod']) {
                const env = branch[envName];

                if (env === undefined) {
                    continue;
                }
                if (env.dependsOn !== undefined) {
                    for (const dependency of env.dependsOn) {
                        if (!(dependency in data)) {
                            throw makeError({...serviceContext, branchName},
                                `cannot depend on nonexistent service ${env.dependsOn}`);
                        }
                    }
                }
            }
        }

        services[serviceName] = service;
    }

    return services;
}

function parseDockerImageBranches(context: ConfigContext,
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
        branchContext.dockerArgs = rawBranch.dockerArgs || branchContext.dockerArgs;

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
    let {registry, imageName, dockerArgs} = context;

    if (data !== undefined) {
        registry = data.registry || registry;
        imageName = data.imageName || imageName;
        dockerArgs = data.dockerArgs || dockerArgs;
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
        dockerArgs,
    });
}
function parseDockerImageStageBranch(context: ConfigContext, data?: ConfigBranchBase): dockerImage.StageBranch {
    let {registry, imageName, dockerArgs} = context;

    if (data !== undefined) {
        registry = data.registry || registry;
        imageName = data.imageName || imageName;
        dockerArgs = data.dockerArgs || dockerArgs;
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
        dockerArgs,
    });
}
function parseDockerImageProdBranch(context: ConfigContext, data?: ConfigBranchBase): dockerImage.ProdBranch {
    let {registry, imageName, version, dockerArgs} = context;

    if (data !== undefined) {
        registry = data.registry || registry;
        imageName = data.imageName || imageName;
        version = data.version || version;
        dockerArgs = data.dockerArgs || dockerArgs;
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
        dockerArgs,
    });
}

function parseDockerDeploymentBranches(context: ConfigContext,
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
        branchContext.containers = rawBranch.containers || branchContext.containers;

        let dev;
        let stage;
        let prod;
        let allowedModes;

        if (branchName === 'master') {
            allowedModes = rawBranch.allowedModes || ['prod'];
        } else {
            allowedModes = rawBranch.allowedModes || ['dev', 'stage'];
        }

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
    if (!('master' in branches)) {
        throw makeError(context, "'master' branch is missing");
    }

    return branches;
}

function parseDockerDeploymentDevBranch(context: ConfigContext,
                                        data?: ConfigBranchBase,
): dockerDeployment.DevBranch {
    let {registry, cluster, namespace, imageNamePrefix, containers, helmArgs} = context;
    let mode;
    let pushDebugContainer;
    let autodelete;

    if (data !== undefined) {
        registry = data.registry || registry;
        cluster = data.cluster || cluster;
        namespace = data.namespace || namespace;
        imageNamePrefix = data.imageNamePrefix || imageNamePrefix;
        helmArgs = data.helmArgs || helmArgs;
        ({mode, pushDebugContainer, autodelete} = data);

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
        helmArgs,
    });
}
function parseDockerDeploymentStageBranch(context: ConfigContext,
                                          data?: ConfigBranchBase,
): dockerDeployment.StageBranch {
    let {registry, cluster, namespace, imageNamePrefix, containers, helmArgs} = context;

    if (data !== undefined) {
        registry = data.registry || registry;
        cluster = data.cluster || cluster;
        namespace = data.namespace || namespace;
        imageNamePrefix = data.imageNamePrefix || imageNamePrefix;
        helmArgs = data.helmArgs || helmArgs;

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
        helmArgs,
    });
}
function parseDockerDeploymentProdBranch(context: ConfigContext,
                                         data?: ConfigBranchBase,
): dockerDeployment.ProdBranch {
    let {registry, cluster, namespace, imageNamePrefix, containers, version, helmArgs} = context;

    if (data !== undefined) {
        registry = data.registry || registry;
        cluster = data.cluster || cluster;
        namespace = data.namespace || namespace;
        imageNamePrefix = data.imageNamePrefix || imageNamePrefix;
        version = data.version || version;
        helmArgs = data.helmArgs || helmArgs;

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
        helmArgs,
    });
}

function parseBuildContainerBranches(context: ConfigContext,
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
        dockerArgs,
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
        dockerArgs,
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
        dockerArgs,
    });
}

function parsePureHelmBranches(context: ConfigContext,
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
    let {cluster, namespace} = context;

    if (data !== undefined) {
        cluster = data.cluster || cluster;
        namespace = data.namespace || namespace;
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
    });
}
function parsePureHelmStageBranch(context: ConfigContext, data?: ConfigBranchBase): pureHelm.StageBranch {
    let {cluster, namespace} = context;

    if (data !== undefined) {
        cluster = data.cluster || cluster;
        namespace = data.namespace || namespace;
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
    });
}
function parsePureHelmProdBranch(context: ConfigContext, data?: ConfigBranchBase): pureHelm.ProdBranch {
    let {cluster, namespace, version} = context;

    if (data !== undefined) {
        cluster = data.cluster || cluster;
        namespace = data.namespace || namespace;
        version = data.version || version;
    }

    if (cluster === undefined) {
        throw makeError(context, "'cluster' is undefined", 'prod');
    }
    if (namespace === undefined) {
        throw makeError(context, "'namespace' is undefined", 'prod');
    }
    if (version === undefined) {
        throw makeError(context, "'version' is undefined", 'prod');
    }

    return new pureHelm.ProdBranch({
        cluster,
        namespace,
        version,
    });
}
