import { DockerDeploymentBranchBase, DockerDeploymentBranchRaw } from './branch-base';

export interface DockerDeploymentBranchStageRaw extends DockerDeploymentBranchRaw {
    recreatePods?: boolean;
}

export class DockerDeploymentBranchStage extends DockerDeploymentBranchBase {
    public recreatePods: boolean = false;

    constructor(rawData: DockerDeploymentBranchStageRaw) {
        super(rawData);

        this.recreatePods = rawData.recreatePods || this.recreatePods;
    }
}
