import Path from 'path';
import { Injectable, context } from '@madwire-media/di-container';
import { PromiseResult, Result } from '@madwire-media/result';
import { RequiresFs, defaultWalkOptions } from '@madwire-media/fs';
import { isLeft } from 'fp-ts/lib/Either';
import { isOnlyObject } from '@madwire-media/magic-object/utils';
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
} from '../..';
import { AnyNonTemplateModuleTypes } from '../../../config/types/any-module';
import {
    ModulePath, ProfileName, VersionName, ParamName,
} from '../../../config/types/common/config-names';
import { joinModulePaths } from '../../../config/helpers/join-path';
import { isString } from '../../../config/helpers/is';
import { Params } from '../../../config/types/common/config';
import { mainServiceKind, MainServiceTypes } from '../../../config/types/services/main';
import { RequiresGit } from '../../../git';
import { RequiresGenerate } from '../../../generate';
import { computeProfile } from '../../../config/helpers/compute-profile';
import { ExpressionContext, InterpolatedString } from '../../../config/types/common/interpolated-string';
import { DefaultEngineHandle } from './handle';
import { DefaultDeferredEngineHandle } from './deferred-handle';
import { TmpFilesSession } from '../../../tmp-files';
import { RequiresCommandRunner } from '../../../commands';
import { RequiresLogger } from '../../../logger';
import { lt } from '../../../logger/types';
import { ValidationError } from '../../../common/validationError';

function mapifyModuleOutput(input: ModuleOutput): ExpressionContext {
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

function getInterpolated(input: unknown, interpolationContext: ExpressionContext): unknown {
    if (input instanceof InterpolatedString) {
        const result = input.interpolateRaw(interpolationContext);

        if (result.isOk()) {
            return result.value;
        } else {
            return '[interpolation error]';
        }
    } else if (input instanceof Map) {
        const output = new Map();

        for (const [key, value] of input) {
            output.set(
                getInterpolated(key, interpolationContext),
                getInterpolated(value, interpolationContext),
            );
        }

        return output;
    } else if (input instanceof Array) {
        const output = [];

        for (const value of input) {
            output.push(getInterpolated(value, interpolationContext));
        }

        return output;
    } else if (isOnlyObject(input)) {
        const output: {[key: string]: unknown} = {};

        for (const [key, value] of Object.entries(input as object)) {
            output[key] = getInterpolated(value, interpolationContext);
        }

        return output;
    } else {
        return input;
    }
}

const paramNames = {
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

        if (parents.length > 0 && config.parsed.kind === mainServiceKind) {
            return Result.Err(new Error(
                `Module ${module} cannot be a main service and a dependency simultaneously`,
            ));
        }

        const impl = this.moduleImpls.get(config.parsed.kind);

        if (impl === undefined) {
            return Result.Err(new Error(
                `No implementations found for module kind '${config.parsed.kind}'`,
            ));
        }

        const computedProfile = computeProfile(config.parsed, profile).try();
        const dependencies: PreloadedDependency[] = [];

        if (computedProfile?.steps !== undefined) {
            const parentsForChild = parents.concat([module]);

            for (const [stepName, step] of computedProfile.steps) {
                let stepPath;

                if (isString(step)) {
                    stepPath = step;
                } else {
                    stepPath = step.module;
                }

                const fullPath = joinModulePaths(
                    Path.dirname(config.filePath) as ModulePath,
                    stepPath,
                );

                if (parents.includes(fullPath)) {
                    return Result.Err(new Error(
                        `Encountered module dependency loop starting from '${fullPath}' and looping at '${module}'`,
                    ));
                }

                // eslint-disable-next-line no-await-in-loop
                const dependency = (await this.preloadConfigInternal(
                    fullPath,
                    profile,
                    loader,
                    parentsForChild,
                )).try();

                dependencies.push({
                    name: stepName,
                    module: dependency,
                    raw: step,
                });
            }
        }

        const moduleParseResult = impl.moduleType.decode(config.parsed);
        if (isLeft(moduleParseResult)) {
            return Result.Err(new ValidationError(
                `Module at ${module} is not a valid '${config.parsed.kind}' module`,
                moduleParseResult.left,
            ));
        }

        let profileParseResult;

        if (config.parsed.profiles === undefined) {
            profileParseResult = impl.profileType.decode({});

            if (isLeft(profileParseResult)) {
                return Result.Err(new ValidationError(
                    `Missing config for profile ${profile} on module ${module}, but at least one property is required`,
                    profileParseResult.left,
                ));
            }
        } else {
            profileParseResult = impl.profileType.decode(computedProfile);

            if (isLeft(profileParseResult)) {
                return Result.Err(new ValidationError(
                    `Computed config for profile ${profile} on module ${module} is invalid`,
                    profileParseResult.left,
                ));
            }
        }

        return Result.Ok({
            dependencies,
            module: moduleParseResult.right,
            profile: profileParseResult.right,
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
        const { fs, logger } = this[context];

        let version = parentVersion;
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

        // TODO: use locked version for versionLocked executions
        if (version !== undefined) {
            serviceContext.set(paramNames.version, version);
        }

        if (impl.setVersion !== undefined) {
            version = impl.setVersion(
                loadedModule.module,
                loadedModule.profile,
                interpolationContext,
            ).try();

            serviceContext.set(paramNames.version, version);
        } else if (version === undefined) {
            throw new Error('Expected root module to set a version');
        }

        for (const dependency of loadedModule.dependencies) {
            let subParams: Params | undefined;

            if (!isString(dependency.raw) && dependency.raw.params !== undefined) {
                subParams = new Map();

                for (const [paramName, paramValueRaw] of dependency.raw.params) {
                    // TODO LATER: add path messaging to error
                    const paramValue = paramValueRaw.interpolate(interpolationContext).try();

                    subParams.set(paramName, paramValue);
                }
            }

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

            if (output instanceof Map) {
                stepsContext.set(dependency.name, output);
            } else {
                stepsContext.set(dependency.name, mapifyModuleOutput(output));
            }
        }

        if (impl.runDeferred !== undefined) {
            const deferredHandle = new DefaultDeferredEngineHandle(this[context]);

            deferrals.push({
                impl,
                module: loadedModule.module,
                profile: loadedModule.profile,
                handle: deferredHandle,
            });
        }

        const sourceConfigFilePath = Path.join(
            session.projectRoot,
            'fm',
            loadedModule.filePath,
        );
        const sourceModulePath = Path.join(
            session.projectRoot,
            'fm',
            loadedModule.path,
        );
        const tmpConfigFilePath = Path.join(
            tmpFilesSession.mainDir,
            loadedModule.filePath,
        );
        const tmpModulePath = Path.join(
            tmpFilesSession.mainDir,
            loadedModule.path,
        );

        await fs.mkdirp(Path.dirname(tmpConfigFilePath));
        await fs.copyFile(sourceConfigFilePath, tmpConfigFilePath, {
            clobber: true,
        });

        if (impl.isSource) {
            await fs.mkdirp(tmpModulePath);
            await fs.copy(sourceModulePath, tmpModulePath, {
                ...defaultWalkOptions,
                clobber: true,
            });
        }

        const handle = new DefaultEngineHandle(
            this[context],
            session,
            loadedModule.path,
            Path.dirname(loadedModule.filePath),
            interpolationContext,
            version,
            tmpFilesSession,
        );

        switch (execution.type) {
            case 'publish': {
                throw new Error('Publish-type executions not yet implemented');
            }

            case 'run': {
                const interpolatedProfile = getInterpolated(
                    loadedModule.profile,
                    interpolationContext,
                );

                logger.info`Running module ${lt.module(loadedModule.path)} (${lt.config(loadedModule.module.kind)})`;
                logger.info`params = ${lt.config(params)}`;
                logger.info`profile = ${lt.config(interpolatedProfile)}`;
                logger.info``;

                return impl.run(
                    loadedModule.module,
                    loadedModule.profile,
                    handle,
                );
            }

            case 'destroy': {
                return impl.destroy(
                    loadedModule.module,
                    loadedModule.profile,
                    handle,
                );
            }
        }
    }
}
