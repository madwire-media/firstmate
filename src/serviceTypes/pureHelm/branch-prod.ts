import { ProdBranch } from '../base/branch';
import { PureHelmBranchBase, PureHelmBranchRaw } from './branch-base';

export interface PureHelmBranchProdRaw extends PureHelmBranchRaw {
    version: string;
    chartmuseum: string;
}

export class PureHelmBranchProd extends PureHelmBranchBase implements ProdBranch {
    public version: string;
    public chartmuseum: string;

    constructor(rawData: PureHelmBranchProdRaw) {
        super(rawData);

        this.version = rawData.version;
        this.chartmuseum = rawData.chartmuseum;
    }
}
