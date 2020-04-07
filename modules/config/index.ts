import { PromiseResult, Result } from '@madwire-media/result';
import { BaseModule, ModulePath } from './types/common/config';

export interface Config {
    init(): PromiseResult<void, Error>;
    discoverPaths(): PromiseResult<ModulePath[], Error>;
    loadPath(path: ModulePath): PromiseResult<ModuleConfig, Error>;
}

export type ConfigEditor<T> = (parsed: T, raw: unknown) => Result<void, Error>;

export interface ModuleConfig<T extends BaseModule = BaseModule> {
    readonly path: ModulePath;
    readonly parsed: T;

    saveEdits(): PromiseResult<void, Error>;
    edit(editor: ConfigEditor<T>): Result<void, Error>;
}
