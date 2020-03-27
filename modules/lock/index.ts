import { PromiseResult } from '@madwire-media/result';
import { ServicePath, ModulePath } from '../config/types/common/firstmate';
import { GitHash } from '../config/types/common/git';

export type ServiceOrModuleHistory = Map<string, GitHash>;

export interface Lock {
    init(): PromiseResult<void, Error>;
    lockServiceOrModuleVersion(
        path: ServicePath | ModulePath,
        version: string,
    ): PromiseResult<void, Error>;
    loadServiceOrModuleHistory(
        path: ServicePath | ModulePath,
    ): PromiseResult<ServiceOrModuleHistory, Error>;
}
