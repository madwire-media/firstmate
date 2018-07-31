import { IBranch } from '../base/branch';
import { DockerDeploymentBranchBase } from './branch-base';
import { DockerDeploymentBranchDev } from './branch-dev';
import { DockerDeploymentBranchProd } from './branch-prod';

export class DockerDeploymentBranch implements IBranch<
    DockerDeploymentBranchDev,
    DockerDeploymentBranchBase,
    DockerDeploymentBranchProd
> {
    public type = 'Docker Deployment';
    public dev?: DockerDeploymentBranchDev;
    public stage?: DockerDeploymentBranchBase;
    public prod?: DockerDeploymentBranchProd;
}
