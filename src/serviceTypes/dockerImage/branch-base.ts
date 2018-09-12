import { BranchBase, BranchBaseRaw } from '../base/branch';

export interface DockerImageBranchRaw extends BranchBaseRaw {
    registry: string;
    imageName: string;
    dockerArgs?: {[key: string]: string};
}

export class DockerImageBranchBase extends BranchBase {
    public registry: string;
    public imageName: string;
    public dockerArgs: {[key: string]: string} = {};

    constructor(rawData: DockerImageBranchRaw) {
        super(rawData);

        this.registry = rawData.registry;
        this.imageName = rawData.imageName;
        if (rawData.dockerArgs !== undefined) {
            this.dockerArgs = rawData.dockerArgs;
        }
    }
}
