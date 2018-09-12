import { BranchBase } from '../base/branch';
import { PureHelmBranchBase, PureHelmBranchRaw } from './branch-base';

export interface PureHelmBranchDevRaw extends PureHelmBranchRaw {
    recreatePods?: boolean;
}

export class PureHelmBranchDev extends PureHelmBranchBase implements BranchBase {
    public recreatePods: boolean = false;

    constructor(rawData: PureHelmBranchDevRaw) {
        super(rawData);

        this.recreatePods = rawData.recreatePods || this.recreatePods;
    }
}
