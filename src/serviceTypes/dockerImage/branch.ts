import { IBranch } from '../base/branch';
import { DockerImageBranchDev } from './branch-dev';
import { DockerImageBranchProd } from './branch-prod';
import { DockerImageBranchStage } from './branch-stage';

export class DockerImageBranch implements IBranch<
    DockerImageBranchDev,
    DockerImageBranchStage,
    DockerImageBranchProd
> {
    public type = 'Docker Image';
    public dev?: DockerImageBranchDev;
    public stage?: DockerImageBranchStage;
    public prod?: DockerImageBranchProd;
}
