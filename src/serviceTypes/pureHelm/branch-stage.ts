import { BranchBase } from '../base/branch';
import { PureHelmBranchBase, PureHelmBranchRaw } from './branch-base';

export interface PureHelmBranchStageRaw extends PureHelmBranchRaw {
    recreatePods?: boolean;
}

export class PureHelmBranchStage extends PureHelmBranchBase implements BranchBase {
    public recreatePods: boolean = false;

    constructor(rawData: PureHelmBranchStageRaw) {
        super(rawData);

        this.recreatePods = rawData.recreatePods || this.recreatePods;
    }
}
