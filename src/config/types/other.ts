import * as t from 'io-ts';
import { ContainerName } from './strings';
import { DockerVolumes, DockerArgs } from './docker';
import { KubernetesVolumes } from './k8s';
import { Port } from './common';

enum DeploymentModeEnum {
    proxy,
    local,
}
export type DeploymentMode = keyof typeof DeploymentModeEnum;
export const DeploymentMode = t.keyof(DeploymentModeEnum, 'DeploymentMode');

export interface Container {
    volumes: DockerVolumes,
    dockerArgs: DockerArgs,
    k8sVolumes: KubernetesVolumes,
    ports: Port[],
    debugCMD: string,
}
export const Container = t.partial({
    volumes: DockerVolumes,
    dockerArgs: DockerArgs,
    k8sVolumes: KubernetesVolumes,
    ports: t.array(Port),
    debugCmd: t.string,
});

export interface Containers {
    [name: string]: Container;
}
export const Containers = t.dictionary(ContainerName, Container);
