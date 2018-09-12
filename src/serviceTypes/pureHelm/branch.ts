import { IBranch } from '../base/branch';
import { PureHelmBranchDev } from './branch-dev';
import { PureHelmBranchProd } from './branch-prod';
import { PureHelmBranchStage } from './branch-stage';

export class PureHelmBranch implements IBranch<
    PureHelmBranchDev,
    PureHelmBranchStage,
    PureHelmBranchProd
> {
    public type = 'Pure Helm';
    public dev?: PureHelmBranchDev;
    public stage?: PureHelmBranchStage;
    public prod?: PureHelmBranchProd;
}
