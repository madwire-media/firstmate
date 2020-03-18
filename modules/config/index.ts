import { PromiseResult } from '@madwire-media/result';

export interface Config {
    load(): PromiseResult<void, Error>;
}
