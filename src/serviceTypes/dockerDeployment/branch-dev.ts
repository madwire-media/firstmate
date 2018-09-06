import { DockerDeploymentBranchBase, DockerDeploymentBranchRaw } from './branch-base';

export enum DockerDeploymentDevMode {
    proxy,
    local,
}

export interface DockerDeploymentBranchDevRaw extends DockerDeploymentBranchRaw {
    mode?: 'proxy' | 'local';
    pushDebugContainer?: boolean;
    autodelete?: boolean;
}

export class DockerDeploymentBranchDev extends DockerDeploymentBranchBase {
    public mode: 'proxy' | 'local' = 'proxy';
    public pushDebugContainer: boolean = false;
    public autodelete: boolean = false;

    constructor(rawData: DockerDeploymentBranchDevRaw) {
        super(rawData);

        this.mode = rawData.mode || this.mode;
        if (rawData.pushDebugContainer !== undefined) {
            this.pushDebugContainer = rawData.pushDebugContainer;
        }
        if (rawData.autodelete !== undefined) {
            this.autodelete = rawData.autodelete;
        }
    }
}
