import { ProdBranch } from '../base/branch';
import { BuildContainerBranchAll, BuildContainerBranchRaw } from './branch-all';

export interface BuildContainerBranchProdRaw extends BuildContainerBranchRaw {
    version: string;
}

export class BuildContainerBranchProd extends BuildContainerBranchAll implements ProdBranch {
    public version: string;

    constructor(rawData: BuildContainerBranchProdRaw) {
        super(rawData);

        this.version = rawData.version;
    }
}
