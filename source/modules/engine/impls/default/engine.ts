import Path from 'path';
import { Injectable, context } from '@madwire-media/di-container';
import { PromiseResult, Result } from '@madwire-media/result';
import { RequiresFs } from '@madwire-media/fs';
import {
    ModuleEngine,
    EngineModuleImpl,
    EngineTemplateImpl,
    ConfigLoader,
    PreloadedConfig,
    PreloadedDependency,
    PreloadedModule,
    EngineSession,
    ModuleOutput,
    EngineDeferredRun,
    MapModuleOutput,
    ModuleExecution,
    AnyModuleImpl,
    paramNames,
} from '../..';
import { AnyNonTemplateModuleTypes } from '../../../config/types/any-module';
import {
    ModulePath, ProfileName, VersionName, ParamName,
} from '../../../config/types/common/config-names';
import { Params } from '../../../config/types/common/config';
import { mainServiceKind, MainServiceTypes } from '../../../config/types/services/main';
import { RequiresGit } from '../../../git';
import { RequiresGenerate } from '../../../generate';
import { computeProfile } from '../../../config/helpers/compute-profile';
import { ExpressionContext } from '../../../config/types/common/interpolated-string';
import { DefaultEngineHandle } from './handle';
import { TmpFilesSession } from '../../../tmp-files';
import { RequiresCommandRunner } from '../../../commands';
import { RequiresLogger } from '../../../logger';
import { DefaultModuleEnginePrivate } from './engine-private';

function mapifyModuleOutput(input: ModuleOutput | ExpressionContext): ExpressionContext {
    if (input instanceof Map) {
        return input;
    }

    const output: ExpressionContext = new Map();

    for (const [key, value] of Object.entries(input)) {
        if (!ParamName.is(key)) {
            throw new Error('Not a valid param name');
        }

        if (typeof value === 'string') {
            output.set(key, value);
        } else {
            output.set(key, mapifyModuleOutput(value));
        }
    }

    return output;
}

type Dependencies =
    & RequiresGit
    & RequiresGenerate
    & RequiresFs
    & RequiresCommandRunner
    & RequiresLogger;

export class DefaultModuleEngine extends Injectable<Dependencies> implements ModuleEngine {
    private moduleImpls: Map<string, EngineModuleImpl<AnyNonTemplateModuleTypes>> = new Map();

    // TODO: implement templates
    private templateImpl?: EngineTemplateImpl;

    private priv: DefaultModuleEnginePrivate;

    constructor(deps: Dependencies, priv?: DefaultModuleEnginePrivate) {
        super(deps);

        this.priv = priv ?? new DefaultModuleEnginePrivate(deps);
    }

    public registerModuleImpl(impl: AnyModuleImpl) {
        this.moduleImpls.set(impl.kind, impl as EngineModuleImpl<AnyNonTemplateModuleTypes>);
    }

    public setTemplateImpl(impl: EngineTemplateImpl) {
        this.templateImpl = impl;
    }

    public async preloadConfig(
        rootModule: ModulePath,
        profile: ProfileName,
        loader: ConfigLoader,
    ): PromiseResult<PreloadedConfig, Error> {
        const preloaded = (
            await this.preloadConfigInternal(
                rootModule,
                profile,
                loader,
                [],
            )
        ).try();

        if (preloaded.module.kind !== mainServiceKind) {
            return Result.Err(new Error(
                `Root module is not a '${mainServiceKind}' module`,
            ));
        }

        return Result.Ok({
            profile,
            // We do a type assertion above, but the types are too complex for
            // TypeScript to recognize our assertion
            rootModule: preloaded as PreloadedModule<MainServiceTypes>,
        });
    }

    public async executeConfig(
        config: PreloadedConfig,
        projectRoot: string,
        execution: ModuleExecution,
        tmpFilesSession: TmpFilesSession,
    ): PromiseResult<EngineDeferredRun[], Error> {
        const { git, generate } = this[context];

        const session: EngineSession = {
            gitBranch: (await git.getCurrentBranch()).try(),
            profile: config.profile,
            uniqueId: generate.uniqueId(),
            // TODO TESTING: this could be injected
            unixTime: Date.now().toString(),
            projectRoot,
        };

        const deferrals: EngineDeferredRun[] = [];

        this.priv.logExecution(
            execution.type,
            config.rootModule.path,
            config.profile,
        );

        (await this.executeConfigInternal(
            config.rootModule,
            session,
            execution,
            undefined,
            undefined,
            tmpFilesSession,
            deferrals,
        )).try();

        return Result.Ok(deferrals);
    }

    private async preloadConfigInternal(
        module: ModulePath,
        profile: ProfileName,
        loader: ConfigLoader,
        parents: ModulePath[],
    ): PromiseResult<PreloadedModule, Error> {
        const config = (await loader(module)).try();

        this.priv.assertDependencyIsNotMainService(parents, config.parsed.kind).try();

        const impl = this.moduleImpls.get(config.parsed.kind);

        if (impl === undefined) {
            return Result.Err(new Error(
                `No implementations found for module kind '${config.parsed.kind}'`,
            ));
        }

        const computedProfile = computeProfile(config.parsed, profile).try();

        const parsedSteps = this.priv.parseSteps(
            computedProfile,
            parents,
            module,
            config.filePath,
        ).try();

        const dependencies: PreloadedDependency[] = [];

        for (const step of parsedSteps) {
            // eslint-disable-next-line no-await-in-loop
            const dependency = (await this.preloadConfigInternal(
                step.module,
                profile,
                loader,
                step.parents,
            )).try();

            dependencies.push({
                name: step.name,
                module: dependency,
                raw: step.raw,
            });
        }

        const parsedModule = this.priv.parseModule(impl, config.parsed).try();
        const parsedProfile = this.priv.parseProfile(
            impl,
            config.parsed,
            profile,
            computedProfile,
        ).try();

        return Result.Ok({
            dependencies,
            module: parsedModule,
            profile: parsedProfile,
            impl,
            path: module,
            filePath: config.filePath,
        });
    }

    private async executeConfigInternal<T extends AnyNonTemplateModuleTypes>(
        loadedModule: PreloadedModule<T>,
        session: EngineSession,
        execution: ModuleExecution,
        parentVersion: VersionName | undefined,
        params: Params | undefined,
        tmpFilesSession: TmpFilesSession,
        deferrals: EngineDeferredRun[],
    ): PromiseResult<ModuleOutput | MapModuleOutput, Error> {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const impl = this.moduleImpls.get(loadedModule.module.kind)!;

        const stepsContext: ExpressionContext = new Map();
        const serviceContext: ExpressionContext = new Map();
        const interpolationContext: ExpressionContext = new Map([
            [paramNames.params, params ?? new Map()],
            [paramNames.steps, stepsContext],
            [paramNames.service, serviceContext],
            [paramNames.git, new Map([
                [paramNames.branch, session.gitBranch],
            ])],
            [paramNames.session, new Map([
                [paramNames.unixTime, session.unixTime],
                [paramNames.uniqueId, session.uniqueId],
                [paramNames.profile, session.profile],
            ])],
        ]);

        const version = this.priv.computeVersion<T>(
            loadedModule,
            parentVersion,
            impl,
            serviceContext,
            interpolationContext,
        ).try();

        for (const dependency of loadedModule.dependencies) {
            const subParams = this.priv.computeSubParams(
                dependency,
                interpolationContext,
            ).try();

            // eslint-disable-next-line no-await-in-loop
            const output = (await this.executeConfigInternal(
                dependency.module,
                session,
                execution,
                version,
                subParams,
                tmpFilesSession,
                deferrals,
            )).try();

            stepsContext.set(dependency.name, mapifyModuleOutput(output));
        }

        this.priv.handleDeferral(loadedModule, impl, deferrals);

        (await this.priv.copyModuleFiles(
            execution.type,
            loadedModule.path,
            loadedModule.filePath,
            session.projectRoot,
            tmpFilesSession.mainDir,
            impl,
        )).try();

        const handle = new DefaultEngineHandle(
            this[context],
            session,
            loadedModule.path,
            Path.dirname(loadedModule.filePath),
            interpolationContext,
            version,
            tmpFilesSession,
        );

        return this.priv.executeModule<T>(
            loadedModule,
            execution.type,
            params,
            interpolationContext,
            impl,
            handle,
        );
    }
}
