import { BranchBase } from '../base/branch';
import { DockerImageBranchBase, DockerImageBranchRaw } from './branch-base';

export interface DockerImageBranchStageRaw extends DockerImageBranchRaw {
    pushImage?: boolean;
}

export class DockerImageBranchStage extends DockerImageBranchBase implements BranchBase {
    public pushImage: boolean = false;

    constructor(rawData: DockerImageBranchStageRaw) {
        super(rawData);

        if (rawData.pushImage !== undefined) {
            this.pushImage = rawData.pushImage;
        }
    }
}
