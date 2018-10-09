import { DockerDeploymentBranchBase, DockerDeploymentBranchRaw } from './branch-base';

export interface DockerDeploymentBranchDevRaw extends DockerDeploymentBranchRaw {
    mode?: 'proxy' | 'local';
    pushDebugContainer?: boolean;
    autodelete?: boolean;
    recreatePods?: boolean;
    chartmuseum?: string;
}

export class DockerDeploymentBranchDev extends DockerDeploymentBranchBase {
    public mode: 'proxy' | 'local' = 'proxy';
    public pushDebugContainer: boolean = false;
    public autodelete: boolean = false;
    public recreatePods: boolean = false;
    public chartmuseum?: string;

    constructor(rawData: DockerDeploymentBranchDevRaw) {
        super(rawData);

        this.mode = rawData.mode || this.mode;
        if (rawData.pushDebugContainer !== undefined) {
            this.pushDebugContainer = rawData.pushDebugContainer;
        }
        if (rawData.autodelete !== undefined) {
            this.autodelete = rawData.autodelete;
        }
        if (rawData.chartmuseum !== undefined) {
            this.chartmuseum = rawData.chartmuseum;
        }
        this.recreatePods = rawData.recreatePods || this.recreatePods;
    }
}
