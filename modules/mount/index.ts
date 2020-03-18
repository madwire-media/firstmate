import { PromiseResult } from '@madwire-media/result';
import { CacheCleanupHandler } from '../tmpfs';

export type MountRequest = {
    [dest: string]: string;
};

export interface AggregateMounter extends CacheCleanupHandler {
    doMount(files: MountRequest, serviceName: string): PromiseResult<void, Error>;
    clearMounts(): PromiseResult<void, Error>;
}
