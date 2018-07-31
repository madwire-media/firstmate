import { IService } from '../base/service';
import { DockerImageBranch } from './branch';

export class DockerImageService implements IService<DockerImageBranch> {
    public readonly type = 'dockerImage';
    public branches: {[branchName: string]: DockerImageBranch} = {};
}
