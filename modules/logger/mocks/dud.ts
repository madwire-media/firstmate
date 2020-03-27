import { unimplementedFn } from '@madwire-media/di-container';
import { Logger } from '..';

export class DudLogger implements Logger {
    public trace() {}

    public info() {}

    public success() {}

    public warn() {}

    public error() {}

    public question = unimplementedFn('question');
}
