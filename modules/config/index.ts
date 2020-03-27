import t from 'io-ts';
import { PromiseResult, Result } from '@madwire-media/result';
import { ServicePath, ModulePath } from './types/common/firstmate';
import { BaseServiceOrModule } from './types/common/config';

export interface Config {
    init(): PromiseResult<void, Error>;
    discoverPaths(): PromiseResult<ServicePath | ModulePath, Error>;
    loadPath(
        path: ServicePath | ModulePath
    ): PromiseResult<ServiceOrModuleConfig, Error>;
}

export type ConfigAugmentation<T> = (parsed: T, raw: unknown) => Result<void, Error>;

export interface ServiceOrModuleConfig<T extends BaseServiceOrModule = BaseServiceOrModule> {
    readonly path: ServicePath | ModulePath;
    readonly parsed: T;

    isService(): this is ServiceConfig<T>;
    isModule(): this is ModuleConfig<T>;

    saveEdits(): PromiseResult<void, Error>;
    augment(augmentation: ConfigAugmentation<T>): Result<void, Error>;
}

export interface ServiceConfig<T extends BaseServiceOrModule> extends ServiceOrModuleConfig<T> {
    readonly path: ServicePath;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isType<N extends t.Type<any, any>>(type: N): this is ServiceConfig<t.TypeOf<N>>;
}

export interface ModuleConfig<T extends BaseServiceOrModule> extends ServiceOrModuleConfig<T> {
    readonly path: ServicePath;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    isType<N extends t.Type<any, any>>(type: N): this is ModuleConfig<t.TypeOf<N>>;
}
