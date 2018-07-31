import { ProdBranch } from '../base/branch';
import { DockerDeploymentBranchBase, DockerDeploymentBranchRaw } from './branch-base';

export interface DockerDeploymentBranchProdRaw extends DockerDeploymentBranchRaw {
    version: string;
}

export class DockerDeploymentBranchProd extends DockerDeploymentBranchBase implements ProdBranch {
    public version: string;

    constructor(rawData: DockerDeploymentBranchProdRaw) {
        super(rawData);

        this.version = rawData.version;
    }
}
