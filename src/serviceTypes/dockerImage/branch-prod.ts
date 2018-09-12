import { ProdBranch } from '../base/branch';
import { DockerImageBranchBase, DockerImageBranchRaw } from './branch-base';

export interface DockerImageBranchProdRaw extends DockerImageBranchRaw {
    version: string;
}

export class DockerImageBranchProd extends DockerImageBranchBase implements ProdBranch {
    public version: string;

    constructor(rawData: DockerImageBranchProdRaw) {
        super(rawData);

        this.version = rawData.version;
    }
}
