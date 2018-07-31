import { ProdBranch } from '../base/branch';
import { PureHelmBranchAll, PureHelmBranchRaw } from './branch-all';

export interface PureHelmBranchProdRaw extends PureHelmBranchRaw {
    version: string;
}

export class PureHelmBranchProd extends PureHelmBranchAll implements ProdBranch {
    public version: string;

    constructor(rawData: PureHelmBranchProdRaw) {
        super(rawData);

        this.version = rawData.version;
    }
}
