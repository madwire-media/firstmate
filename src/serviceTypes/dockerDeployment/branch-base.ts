import { empty } from '../../helpers/empty';
import { BranchBase, Volumes } from '../base/branch';
import { Port } from '../base/branch';
import { PureHelmBranchRaw } from '../pureHelm/branch-all';

interface ContainerRaw {
    k8sVolumes?: Volumes;
    volumes?: Volumes;
    dockerArgs?: {[key: string]: string};
    ports?: Array<number | Port>;
}

interface Container {
    k8sVolumes?: Volumes;
    volumes?: Volumes;
    ports?: Port[];
    dockerArgs?: {[key: string]: string};
    debugCMD?: string;
}

export interface DockerDeploymentBranchRaw extends PureHelmBranchRaw {
    registry: string;
    imageNamePrefix?: string;
    containers?: {[containerName: string]: ContainerRaw};
}

export class DockerDeploymentBranchBase extends BranchBase {
    public registry: string;
    public imageNamePrefix?: string;
    public cluster: string;
    public namespace: string;
    public containers: {[containerName: string]: Container} = {};
    public helmArgs: {[argName: string]: string} = {};

    constructor(rawData: DockerDeploymentBranchRaw) {
        super(rawData);

        this.registry = rawData.registry;
        this.imageNamePrefix = rawData.imageNamePrefix;
        this.cluster = rawData.cluster;
        this.namespace = rawData.namespace;

        if (rawData.containers !== undefined) {
            for (const containerName in rawData.containers) {
                const rawContainer = rawData.containers[containerName];
                let ports;

                if (rawContainer.ports !== undefined) {
                    ports = rawContainer.ports.map((p) => {
                        if (typeof p === 'number') {
                            return {
                                local: p,
                                remote: p,
                            };
                        } else {
                            return p;
                        }
                    });
                }

                this.containers[containerName] = {
                    ...rawContainer, ports,
                };
            }
        }

        if (rawData.helmArgs !== undefined && !empty(rawData.helmArgs)) {
            this.helmArgs = rawData.helmArgs;
        }
    }
}
