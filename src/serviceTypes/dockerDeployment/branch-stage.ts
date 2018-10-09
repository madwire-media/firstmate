import { DockerDeploymentBranchBase, DockerDeploymentBranchRaw } from './branch-base';

export interface DockerDeploymentBranchStageRaw extends DockerDeploymentBranchRaw {
    recreatePods?: boolean;
    chartmuseum?: string;
}

export class DockerDeploymentBranchStage extends DockerDeploymentBranchBase {
    public recreatePods: boolean = false;
    public chartmuseum?: string;

    constructor(rawData: DockerDeploymentBranchStageRaw) {
        super(rawData);

        if (rawData.chartmuseum !== undefined) {
            this.chartmuseum = rawData.chartmuseum;
        }
        this.recreatePods = rawData.recreatePods || this.recreatePods;
    }
}
