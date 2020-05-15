import * as t from 'io-ts';

import { PromiseResult, Result } from '@madwire-media/result';
import { CopyFiles, InterpolatedDependency } from '../config/types/common/config';
import {
    ModulePath, ProfileName, DependencyName, VersionName, ParamName,
} from '../config/types/common/config-names';
import { ModuleConfig } from '../config';
import { AnyNonTemplateModuleTypes, AnyModuleTypes } from '../config/types/any-module';
import { InterpolatedString, ExpressionContext } from '../config/types/common/interpolated-string';
import { Command, CommandResult } from '../commands';
import { MainServiceTypes } from '../config/types/services/main';
import { TmpFilesSession } from '../tmp-files';

export type ModuleExecution = {
    versionLocked?: false;
    type: 'run' | 'destroy';
} | {
    versionLocked: true;
    type: 'publish' | 'run' | 'destroy';
};

export type ConfigLoader = (path: ModulePath) => PromiseResult<ModuleConfig, Error>;

export type AnyModuleImpl<
    T extends AnyNonTemplateModuleTypes = AnyNonTemplateModuleTypes
> =
    T extends AnyNonTemplateModuleTypes ? EngineModuleImpl<T> : never;

export interface ModuleEngine {
    registerModuleImpl(
        impl: AnyModuleImpl
    ): void;
    setTemplateImpl(impl: EngineTemplateImpl): void;

    preloadConfig(
        rootModule: ModulePath,
        profile: ProfileName,
        loader: ConfigLoader,
    ): PromiseResult<PreloadedConfig, Error>;
    executeConfig(
        config: PreloadedConfig,
        projectRoot: string,
        execution: ModuleExecution,
        tmpFilesSession: TmpFilesSession,
    ): PromiseResult<EngineDeferredRun[], Error>;
}

export interface PreloadedConfig {
    /** Profile for which this config was loaded */
    readonly profile: ProfileName;
    /** Root module loaded in this config */
    readonly rootModule: PreloadedModule<MainServiceTypes>;
}

export interface PreloadedModule<T extends AnyNonTemplateModuleTypes = AnyNonTemplateModuleTypes> {
    /** Preloaded dependencies of this module */
    readonly dependencies: PreloadedDependency[];
    /** Fully parsed and type-checked config */
    readonly module: T['moduleType'];
    /** Fully parsed, computed and type-checked profile  */
    readonly profile: T['profileType'];
    /** Associated engine implementation for module type */
    readonly impl: EngineModuleImpl<T>;
    /** Module path */
    readonly path: ModulePath;
    /** Project-relative config file path */
    readonly filePath: string;
}

export interface PreloadedDependency {
    /** Name for dependency */
    readonly name: DependencyName;
    /** Loaded dependency module */
    readonly module: PreloadedModule;
    /** Raw dependency config */
    readonly raw: ModulePath | InterpolatedDependency;
}

export interface ModuleInput {
    [key: string]: InterpolatedString | ModuleInput;
}

export interface ModuleOutput {
    [key: string]: string | ModuleOutput;
}

export type MapModuleOutput = Map<ParamName, string | MapModuleOutput>;

export interface EngineSession {
    readonly gitBranch: string;
    readonly unixTime: string;
    readonly uniqueId: string;
    readonly profile: string;
    readonly projectRoot: string;
}

export interface EngineHandle {
    getProjectRoot(): string;
    getCwd(): string;
    getInterpolationContext(): ExpressionContext;
    getContextualVersion(): VersionName;

    copyFiles(files: CopyFiles): PromiseResult<void, Error>;
    createTmpDir(): PromiseResult<string, Error>;
    executeCommand(command: Command): PromiseResult<CommandResult, Error>;
    executeHiddenCommand(command: Command): PromiseResult<CommandResult, Error>;
}

export interface EngineHandleDeferred {
    getInterpolationContext(): ExpressionContext;
    registerCancelHandler(handler: () => PromiseResult<void, Error>): void;

    // TODO: executeCommand?
}

export interface EngineDeferredRun<
    T extends AnyNonTemplateModuleTypes = AnyNonTemplateModuleTypes
> {
    impl: EngineModuleImpl<T>;
    module: T['moduleType'];
    profile: T['profileType'];
    handle: EngineHandleDeferred;
}

export interface EngineModuleImpl<T extends AnyModuleTypes> {
    readonly kind: T['moduleType']['kind'];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly moduleType: t.Type<T['moduleType'], any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readonly profileType: t.Type<T['profileType'], any>;
    readonly isSource: T['isSource'];

    run?(
        module: T['moduleType'],
        profile: T['profileType'],
        handle: EngineHandle,
    ): PromiseResult<ModuleOutput | MapModuleOutput, Error>;
    runParams?(
        module: T['moduleType'],
        profile: T['profileType'],
        handle: EngineHandle,
    ): Result<ModuleOutput | MapModuleOutput, Error>;
    destroy?(
        module: T['moduleType'],
        profile: T['profileType'],
        handle: EngineHandle,
    ): PromiseResult<ModuleOutput | MapModuleOutput, Error>;
    destroyParams?(
        module: T['moduleType'],
        profile: T['profileType'],
        handle: EngineHandle,
    ): Result<ModuleOutput | MapModuleOutput, Error>;
    runDeferred?(
        module: T['moduleType'],
        profile: T['profileType'],
        handle: EngineHandle,
    ): PromiseResult<void, Error>;
    setVersion?(
        module: T['moduleType'],
        profile: T['profileType'],
        context: ExpressionContext,
    ): Result<VersionName, Error>;
}

export interface EngineTemplateImpl {
    compile(type: string): PromiseResult<CompiledEngineTemplate, Error>;
}

export interface TemplateModuleStub {
    kind: string;
    steps: Map<string, ModulePath>;
}

export interface CompiledEngineTemplate {
    readonly mainTemplate: string;

    getStubsForProfile(profile: string): Map<string, TemplateModuleStub>;
    renderTemplate(input: ModuleInput): Map<string, AnyNonTemplateModuleTypes>;
    computeOutput(childOutputs: Map<string, MapModuleOutput>): ModuleOutput | MapModuleOutput;
}

export const paramNames = {
    params: 'params' as ParamName,
    steps: 'steps' as ParamName,
    service: 'service' as ParamName,
    version: 'version' as ParamName,
    git: 'git' as ParamName,
    branch: 'branch' as ParamName,
    session: 'session' as ParamName,
    unixTime: 'unixTime' as ParamName,
    uniqueId: 'uniqueId' as ParamName,
    profile: 'profile' as ParamName,
};
