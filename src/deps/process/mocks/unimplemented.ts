import { Process } from '..';
import { unimplemented } from '../../../util/container/mock';

export class UnimplementedProcess implements Process {
    public cwd(): any {
        return unimplemented();
    }
}
