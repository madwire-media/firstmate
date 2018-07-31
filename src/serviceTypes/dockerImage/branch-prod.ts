import { ProdBranch } from '../base/branch';
import { DockerImageBranchAll, DockerImageBranchRaw } from './branch-all';

export interface DockerImageBranchProdRaw extends DockerImageBranchRaw {
    version: string;
}

export class DockerImageBranchProd extends DockerImageBranchAll implements ProdBranch {
    public version: string;

    constructor(rawData: DockerImageBranchProdRaw) {
        super(rawData);

        this.version = rawData.version;
    }
}
