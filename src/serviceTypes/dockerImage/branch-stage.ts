import { BranchBase } from '../base/branch';
import { DockerImageBranchAll, DockerImageBranchRaw } from './branch-base';

export interface DockerImageBranchStageRaw extends DockerImageBranchRaw {
    pushImage?: boolean;
}

export class DockerImageBranchStage extends DockerImageBranchAll implements BranchBase {
    public pushImage: boolean = false;

    constructor(rawData: DockerImageBranchStageRaw) {
        super(rawData);

        if (rawData.pushImage !== undefined) {
            this.pushImage = rawData.pushImage;
        }
    }
}
