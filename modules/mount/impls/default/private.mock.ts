import { unimplementedFn, MockInjectable } from '@madwire-media/di-container';
import { MountPrivate } from './private';

export class UnimplementedMountPrivate extends MockInjectable implements MountPrivate {
    public downloadFile = unimplementedFn('downloadFile');

    public isHttp = unimplementedFn('isHttp');

    public isMountedUnderneath = unimplementedFn('isMountedUnderneath');

    public readMountRecord = unimplementedFn('readMountRecord');

    public writeMountRecord = unimplementedFn('writeMountRecord');

    public deleteMountRecord = unimplementedFn('deleteMountRecord');

    public getMountRecords = unimplementedFn('getMountRecords');
}
