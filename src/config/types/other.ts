import * as t from 'io-ts';
import { Env, Port } from './common';
import { DockerArgs, DockerVolumes } from './docker';
import { KubernetesVolumes } from './k8s';
import { ContainerName, ServiceName } from './strings';

enum DeploymentModeEnum {
    proxy,
    local,
}
export type DeploymentMode = keyof typeof DeploymentModeEnum;
export const DeploymentMode = t.keyof(DeploymentModeEnum, 'DeploymentMode');

export interface ConfiguredDependency {
    service: ServiceName;
    env: Env;
}
export const ConfiguredDependency = t.type({
    service: ServiceName,
    env: Env,
});

export interface Container {
    volumes?: DockerVolumes;
    dockerArgs?: DockerArgs;
    k8sVolumes?: KubernetesVolumes;
    ports?: Port[];
    debugCMD?: string;
}
export const Container = t.partial({
    volumes: DockerVolumes,
    dockerArgs: DockerArgs,
    k8sVolumes: KubernetesVolumes,
    ports: t.array(Port),
    debugCMD: t.string,
}, 'Container');

export interface Containers {
    [name: string]: Container;
}
export const Containers = t.dictionary(ContainerName, Container);
