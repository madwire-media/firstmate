import { Port } from '../serviceTypes/base/branch';
import * as buildContainer from '../serviceTypes/buildContainer/module';
import * as dockerDeployment from '../serviceTypes/dockerDeployment/module';
import * as dockerImage from '../serviceTypes/dockerImage/module';
import * as pureHelm from '../serviceTypes/pureHelm/module';

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

export interface ConfigParams {
    project: string;
    defaultService?: string;
    services: {[serviceName: string]: Service};
}

export interface ConfigBase {
    project: string;
    defaults?: ConfigDefaults;
    services: {[serviceName: string]: ConfigService};
}
export interface ConfigDefaults {
    registry?: string;
    service?: string;
    chartmuseum?: string;
}
export interface ConfigService {
    type: string;
    branches: {[branchName: string]: ConfigBranch};
}
export interface ConfigContainer {
    volumes?: {[source: string]: string};
    dockerArgs?: {[key: string]: string | number | boolean};
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
    dockerArgs?: {[key: string]: string | number | boolean};
    autodelete?: boolean;
    helmArgs?: {[argName: string]: string | number | boolean};
    chartmuseum?: string;
    releaseName?: string;
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
