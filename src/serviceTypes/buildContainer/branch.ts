import { IBranch } from '../base/branch';
import { BuildContainerBranchAll } from './branch-all';
import { BuildContainerBranchProd } from './branch-prod';

export class BuildContainerBranch implements IBranch<
    BuildContainerBranchAll,
    BuildContainerBranchAll,
    BuildContainerBranchProd
> {
    public type = 'Build Container';
    public dev?: BuildContainerBranchAll;
    public stage?: BuildContainerBranchAll;
    public prod?: BuildContainerBranchProd;
}
