import { IService } from '../base/service';
import { PureHelmBranch } from './branch';

export class PureHelmService implements IService<PureHelmBranch> {
    public readonly type = 'pureHelm';
    public branches: {[branchName: string]: PureHelmBranch} = {};
}
