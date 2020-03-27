import { PromiseResult } from '@madwire-media/result';
import { Result } from '@madwire-media/result/lib/combined';
import { Injectable } from '@madwire-media/di-container';
import { RequiresFs } from '@madwire-media/fs';
import { BaseServiceOrModule } from '../../types/common/config';
import {
    ServiceOrModuleConfig, ServiceConfig, ModuleConfig, ConfigAugmentation,
} from '../..';
import { ModulePath, ServicePath } from '../../types/common/firstmate';
import { RequiresEnv } from '../../../env';

type Dependencies = RequiresEnv & RequiresFs;

export abstract class DefaultServiceOrModuleConfig<
    T extends BaseServiceOrModule
> extends Injectable<Dependencies> implements ServiceOrModuleConfig<T> {
    public abstract readonly path: ServicePath | ModulePath;

    public abstract readonly parsed: T;

    protected abstract readonly raw: unknown;

    public abstract isService(): this is ServiceConfig<T>;

    public abstract isModule(): this is ModuleConfig<T>;

    public saveEdits(): PromiseResult<void, Error> {
        // TODO: implement once the root impl has service/module metadata dict
        // built or at least started
        throw new Error('unimplemented');
    }

    public augment(augmentation: ConfigAugmentation<T>): Result<void, Error> {
        return augmentation(this.parsed, this.raw);
    }
}

export class DefaultServiceConfig<
    T extends BaseServiceOrModule
> extends DefaultServiceOrModuleConfig<T> {
    public readonly path: ServicePath;

    public readonly parsed: T;

    protected readonly raw: unknown;

    constructor(deps: Dependencies, path: ServicePath, parsed: T, raw: unknown) {
        super(deps);

        this.path = path;
        this.parsed = parsed;
        this.raw = raw;
    }

    public isService(): this is ServiceConfig<T> {
        return true;
    }

    public isModule(): this is ModuleConfig<T> {
        return false;
    }
}

export class DefaultModuleConfig<
    T extends BaseServiceOrModule
> extends DefaultServiceOrModuleConfig<T> {
    public readonly path: ModulePath;

    public readonly parsed: T;

    protected readonly raw: unknown;

    constructor(deps: Dependencies, path: ModulePath, parsed: T, raw: unknown) {
        super(deps);

        this.path = path;
        this.parsed = parsed;
        this.raw = raw;
    }

    public isService(): this is ServiceConfig<T> {
        return false;
    }

    public isModule(): this is ModuleConfig<T> {
        return true;
    }
}
