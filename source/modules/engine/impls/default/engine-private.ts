import Path from 'path';
import { RequiresFs, FsError, defaultWalkOptions } from '@madwire-media/fs';
import { Injectable, context } from '@madwire-media/di-container';
import { Result, PromiseResult } from '@madwire-media/result';
import { isLeft } from 'fp-ts/lib/Either';
import { isOnlyObject } from '@madwire-media/magic-object/utils';
import { RequiresGit } from '../../../git';
import { RequiresGenerate } from '../../../generate';
import { RequiresCommandRunner } from '../../../commands';
import { RequiresLogger } from '../../../logger';
import {
    ModuleExecution,
    EngineModuleImpl,
    paramNames,
    PreloadedModule,
    PreloadedDependency,
    EngineDeferredRun,
    ModuleOutput,
    MapModuleOutput,
    EngineHandle,
} from '../..';
import {
    ModulePath, ProfileName, DependencyName, VersionName,
} from '../../../config/types/common/config-names';
import { lt } from '../../../logger/types';
import { mainServiceKind } from '../../../config/types/services/main';
import {
    BaseModuleProfile, InterpolatedDependency, BaseModule, Params,
} from '../../../config/types/common/config';
import { isString } from '../../../config/helpers/is';
import { joinModulePaths } from '../../../config/helpers/join-path';
import { AnyNonTemplateModuleTypes } from '../../../config/types/any-module';
import { ValidationError } from '../../../common/validationError';
import { ExpressionContext, InterpolatedString } from '../../../config/types/common/interpolated-string';
import { DefaultDeferredEngineHandle } from './deferred-handle';

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


type Dependencies =
    & RequiresGit
    & RequiresGenerate
    & RequiresFs
    & RequiresCommandRunner
    & RequiresLogger;

export interface ParsedStep {
    module: ModulePath;
    parents: ModulePath[];
    name: DependencyName;
    raw: ModulePath | InterpolatedDependency;
}

export class DefaultModuleEnginePrivate extends Injectable<Dependencies> {
    public logExecution(
        executionType: ModuleExecution['type'],
        path: ModulePath,
        profile: ProfileName,
    ) {
        const { logger } = this[context];

        switch (executionType) {
            case 'publish': {
                logger.info`Publishing service ${lt.module(path)}:${lt.environment(profile)}`;
                logger.info``;
                break;
            }

            case 'run': {
                logger.info`Running service ${lt.module(path)}:${lt.environment(profile)}`;
                logger.info``;
                break;
            }

            case 'destroy': {
                logger.info`Destroying service ${lt.module(path)}:${lt.environment(profile)}`;
                logger.info``;
                break;
            }
        }
    }

    public assertDependencyIsNotMainService(
        parents: ModulePath[],
        moduleKind: string,
    ): Result<void, Error> {
        if (parents.length > 0 && moduleKind === mainServiceKind) {
            return Result.Err(new Error(
                `Module ${module} cannot be a main service and a dependency simultaneously`,
            ));
        }

        return Result.voidOk;
    }

    public parseSteps(
        computedProfile: BaseModuleProfile | undefined,
        parents: ModulePath[],
        module: ModulePath,
        configFilePath: string,
    ): Result<ParsedStep[], Error> {
        const steps: ParsedStep[] = [];

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
                    Path.dirname(configFilePath) as ModulePath,
                    stepPath,
                );

                if (parents.includes(fullPath)) {
                    return Result.Err(new Error(
                        `Encountered module dependency loop starting from '${fullPath}' and looping at '${module}'`,
                    ));
                }

                steps.push({
                    module: fullPath,
                    parents: parentsForChild,
                    name: stepName,
                    raw: step,
                });
            }
        }

        return Result.Ok(steps);
    }

    public parseModule(
        impl: EngineModuleImpl<AnyNonTemplateModuleTypes>,
        parsedConfig: BaseModule,
    ): Result<AnyNonTemplateModuleTypes['moduleType'], Error> {
        const moduleParseResult = impl.moduleType.decode(parsedConfig);

        if (isLeft(moduleParseResult)) {
            return Result.Err(new ValidationError(
                `Module at ${module} is not a valid '${parsedConfig.kind}' module`,
                moduleParseResult.left,
            ));
        } else {
            return Result.Ok(moduleParseResult.right);
        }
    }

    public parseProfile(
        impl: EngineModuleImpl<AnyNonTemplateModuleTypes>,
        parsedConfig: BaseModule,
        profileName: ProfileName,
        computedProfile: BaseModuleProfile | undefined,
    ): Result<AnyNonTemplateModuleTypes['profileType'], Error> {
        let profileParseResult;

        if (parsedConfig.profiles === undefined) {
            profileParseResult = impl.profileType.decode({});

            if (isLeft(profileParseResult)) {
                return Result.Err(new ValidationError(
                    `Missing config for profile ${profileName} on module ${module}, but at least one property is required`,
                    profileParseResult.left,
                ));
            }
        } else {
            profileParseResult = impl.profileType.decode(computedProfile);

            if (isLeft(profileParseResult)) {
                return Result.Err(new ValidationError(
                    `Computed config for profile ${profileName} on module ${module} is invalid`,
                    profileParseResult.left,
                ));
            }
        }

        return Result.Ok(profileParseResult.right);
    }

    public computeVersion<T extends AnyNonTemplateModuleTypes>(
        loadedModule: PreloadedModule<T>,
        parentVersion: VersionName | undefined,
        impl: EngineModuleImpl<AnyNonTemplateModuleTypes>,
        serviceContext: ExpressionContext,
        interpolationContext: ExpressionContext,
    ): Result<VersionName, Error> {
        let version = parentVersion;

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
            return Result.Err(new Error('Expected root module to set a version'));
        }

        return Result.Ok(version);
    }

    public computeSubParams(
        dependency: PreloadedDependency,
        interpolationContext: ExpressionContext,
    ): Result<Params | undefined, Error> {
        let subParams: Params | undefined;

        if (!isString(dependency.raw) && dependency.raw.params !== undefined) {
            subParams = new Map();

            for (const [paramName, paramValueRaw] of dependency.raw.params) {
                // TODO LATER: add path messaging to error
                const paramValue = paramValueRaw.interpolate(interpolationContext).try();

                subParams.set(paramName, paramValue);
            }
        }

        return Result.Ok(subParams);
    }

    public handleDeferral<T extends AnyNonTemplateModuleTypes>(
        loadedModule: PreloadedModule<T>,
        impl: EngineModuleImpl<AnyNonTemplateModuleTypes>,
        deferrals: EngineDeferredRun[],
    ): void {
        if (impl.runDeferred !== undefined) {
            const deferredHandle = new DefaultDeferredEngineHandle(this[context]);

            deferrals.push({
                impl,
                module: loadedModule.module,
                profile: loadedModule.profile,
                handle: deferredHandle,
            });
        }
    }

    public async copyModuleFiles(
        executionType: ModuleExecution['type'],
        modulePath: ModulePath,
        moduleFilePath: string,
        projectRoot: string,
        tmpMainDir: string,
        impl: EngineModuleImpl<AnyNonTemplateModuleTypes>,
    ): PromiseResult<void, FsError> {
        const { fs } = this[context];

        if (executionType !== 'destroy') {
            const sourceConfigFilePath = Path.join(
                projectRoot,
                'fm',
                moduleFilePath,
            );
            const sourceModulePath = Path.join(
                projectRoot,
                'fm',
                modulePath,
            );
            const tmpConfigFilePath = Path.join(
                tmpMainDir,
                moduleFilePath,
            );
            const tmpModulePath = Path.join(
                tmpMainDir,
                modulePath,
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
        }

        return Result.voidOk;
    }

    public async executeModule<T extends AnyNonTemplateModuleTypes>(
        loadedModule: PreloadedModule<T>,
        executionType: ModuleExecution['type'],
        params: Params | undefined,
        interpolationContext: ExpressionContext,
        impl: EngineModuleImpl<AnyNonTemplateModuleTypes>,
        handle: EngineHandle,
    ): PromiseResult<ModuleOutput | MapModuleOutput, Error> {
        const { logger } = this[context];

        switch (executionType) {
            case 'publish': {
                throw new Error('Publish-type executions not yet implemented');
            }

            case 'run': {
                if (impl.run !== undefined) {
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
                } else if (impl.runParams !== undefined) {
                    return impl.runParams(
                        loadedModule.module,
                        loadedModule.profile,
                        handle,
                    );
                } else {
                    return Result.Ok({});
                }
            }

            case 'destroy': {
                if (impl.destroy !== undefined) {
                    const interpolatedProfile = getInterpolated(
                        loadedModule.profile,
                        interpolationContext,
                    );

                    logger.info`Destroying module ${lt.module(loadedModule.path)} (${lt.config(loadedModule.module.kind)})`;
                    logger.info`params = ${lt.config(params)}`;
                    logger.info`profile = ${lt.config(interpolatedProfile)}`;
                    logger.info``;

                    return impl.destroy(
                        loadedModule.module,
                        loadedModule.profile,
                        handle,
                    );
                } else if (impl.destroyParams !== undefined) {
                    return impl.destroyParams(
                        loadedModule.module,
                        loadedModule.profile,
                        handle,
                    );
                } else {
                    return Result.Ok({});
                }
            }
        }
    }
}
