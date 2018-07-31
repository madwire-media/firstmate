import { IBranch } from '../base/branch';
import { PureHelmBranchAll } from './branch-all';
import { PureHelmBranchProd } from './branch-prod';

export class PureHelmBranch implements IBranch<
    PureHelmBranchAll,
    PureHelmBranchAll,
    PureHelmBranchProd
> {
    public type = 'Pure Helm';
    public dev?: PureHelmBranchAll;
    public stage?: PureHelmBranchAll;
    public prod?: PureHelmBranchProd;
}
