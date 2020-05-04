import { Injectable } from '@madwire-media/di-container';
import { PromiseResult, Result } from '@madwire-media/result';
import { EngineModuleImpl, EngineHandle, ModuleOutput } from '../..';
import {
    DockerPushStepTypes, DockerPushStep, dockerPushStepKind, DockerPushStepProfile,
} from '../../../config/types/steps/docker-push';
import { DockerRegistry } from '../../../config/types/common/docker';
import { Docker } from '../../../commands/docker';

export type Dependencies = {};

export class DockerPushStepImpl
    extends Injectable<Dependencies>
    implements EngineModuleImpl<DockerPushStepTypes>
// eslint-disable-next-line @typescript-eslint/brace-style
{
    public readonly kind = dockerPushStepKind;

    public readonly moduleType = DockerPushStep;

    public readonly profileType = DockerPushStepProfile;

    public readonly isSource = false;

    public async run(
        _module: DockerPushStep,
        profile: DockerPushStepProfile,
        handle: EngineHandle,
    ): PromiseResult<ModuleOutput, Error> {
        const interpolationContext = handle.getInterpolationContext();
        const version = handle.getContextualVersion();

        const source = profile.source.interpolate(interpolationContext).try();
        const imageName = profile.imageName.interpolate(interpolationContext).try();

        let registry: DockerRegistry | undefined;
        if (profile.registry !== undefined) {
            registry = profile.registry.interpolate(interpolationContext).try();
        }

        let target;
        if (registry !== undefined) {
            target = `${registry}/${imageName}:${version}`;
        } else {
            target = `${imageName}:${version}`;
        }

        if (source !== target) {
            const tagCommand = Docker.tag({
                source,
                target,
            });

            const tagResult = (await handle.executeCommand(tagCommand)).try();

            if (tagResult.status !== 0) {
                return Result.Err(new Error('Docker tag failed, see output'));
            }
        }

        const pushCommand = Docker.push({
            imageRef: target,
        });

        const pushResult = (await handle.executeCommand(pushCommand)).try();

        if (pushResult.status !== 0) {
            return Result.Err(new Error('Docker push failed, see output'));
        }

        return Result.Ok({
            url: target,
        });
    }

    public destroyParams(
        _module: DockerPushStep,
        profile: DockerPushStepProfile,
        handle: EngineHandle,
    ): Result<ModuleOutput, Error> {
        const interpolationContext = handle.getInterpolationContext();
        const version = handle.getContextualVersion();

        const imageName = profile.imageName.interpolate(interpolationContext).try();

        let registry: DockerRegistry | undefined;
        if (profile.registry !== undefined) {
            registry = profile.registry.interpolate(interpolationContext).try();
        }

        let target;
        if (registry !== undefined) {
            target = `${registry}/${imageName}:${version}`;
        } else {
            target = `${imageName}:${version}`;
        }

        return Result.Ok({
            url: target,
        });
    }
}
