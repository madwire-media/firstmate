import { BranchBase, IBranch, ProdBranch } from './branch';

export interface IService<T extends IBranch<BranchBase, BranchBase, BranchBase & ProdBranch>> {
    type: string;
    branches: {[branchName: string]: T};
}
