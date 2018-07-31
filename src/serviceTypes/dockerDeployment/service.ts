import { IService } from '../base/service';
import { DockerDeploymentBranch } from './branch';

export class DockerDeploymentService implements IService<DockerDeploymentBranch> {
    public readonly type = 'dockerDeployment';
    public branches: {[branchName: string]: DockerDeploymentBranch} = {};
}
