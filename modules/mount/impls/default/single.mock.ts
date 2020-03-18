import { unimplementedFn, MockInjectable } from '@madwire-media/di-container';
import { SingleMounter } from './single';

export class UnimplementedSingleMounter extends MockInjectable implements SingleMounter {
    public mountFile = unimplementedFn('mountFile');

    public unmountFile = unimplementedFn('unmountFile');
}
