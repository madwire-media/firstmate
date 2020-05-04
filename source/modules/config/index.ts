import { PromiseResult } from '@madwire-media/result';
import { BaseModule } from './types/common/config';
import { ModulePath } from './types/common/config-names';

export interface Config {
    locateProject(): PromiseResult<ProjectConfig, Error>;
}

export interface ProjectConfig {
    readonly projectName: string;
    readonly projectRoot: string;

    loadModule(path: ModulePath): PromiseResult<ModuleConfig, Error>;
}

export interface ModuleConfig<T extends BaseModule = BaseModule> {
    /** Config file path relative to fm folder */
    readonly filePath: string;
    /** Module path */
    readonly path: ModulePath;
    /** Parsed config */
    readonly parsed: T;
    /** Raw config */
    readonly raw: unknown;
}
