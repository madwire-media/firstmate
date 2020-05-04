import { PromiseResult } from '@madwire-media/result';
import { ModulePath, ProfileName } from '../config/types/common/config-names';

export interface Api {
    run(service: ModulePath, profile: ProfileName): PromiseResult<void, Error>;
    destroy(service: ModulePath, profile: ProfileName): PromiseResult<void, Error>;
}
