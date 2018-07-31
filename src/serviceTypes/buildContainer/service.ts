import { IService } from '../base/service';
import { BuildContainerBranch } from './branch';

export class BuildContainerService implements IService<BuildContainerBranch> {
    public readonly type = 'buildContainer';
    public branches: {[branchName: string]: BuildContainerBranch} = {};
}
