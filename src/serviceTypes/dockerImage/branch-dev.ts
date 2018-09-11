import { BranchBase } from '../base/branch';
import { DockerImageBranchAll, DockerImageBranchRaw } from './branch-base';

export interface DockerImageBranchDevRaw extends DockerImageBranchRaw {
    pushImage?: boolean;
}

export class DockerImageBranchDev extends DockerImageBranchAll implements BranchBase {
    public pushImage: boolean = false;

    constructor(rawData: DockerImageBranchDevRaw) {
        super(rawData);

        if (rawData.pushImage !== undefined) {
            this.pushImage = rawData.pushImage;
        }
    }
}
