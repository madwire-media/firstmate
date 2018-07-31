import { IBranch } from '../base/branch';
import { DockerImageBranchAll } from './branch-all';
import { DockerImageBranchProd } from './branch-prod';

export class DockerImageBranch implements IBranch<
    DockerImageBranchAll,
    DockerImageBranchAll,
    DockerImageBranchProd
> {
    public type = 'Docker Image';
    public dev?: DockerImageBranchAll;
    public stage?: DockerImageBranchAll;
    public prod?: DockerImageBranchProd;
}
