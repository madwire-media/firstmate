import { Process } from '..';
import { unimplementedCall, unimplementedFn } from '../../../util/container/mock';

export class UnimplementedProcess implements Process {
    public cwd = unimplementedFn('cwd');
}
