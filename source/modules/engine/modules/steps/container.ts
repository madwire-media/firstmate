import { Injectable } from '@madwire-media/di-container';
import { PromiseResult, Result } from '@madwire-media/result';
import { EngineModuleImpl, ModuleOutput, EngineHandle } from '../..';
import {
    ContainerStepTypes, containerStepKind, ContainerStep, ContainerStepProfile,
} from '../../../config/types/steps/container';
import { DockerEnv, DockerCommand, DockerVolumes } from '../../../config/types/common/docker';
import { Docker } from '../../../commands/docker';

export type Dependencies = {};

export class ContainerStepImpl
    extends Injectable<Dependencies>
    implements EngineModuleImpl<ContainerStepTypes>
// eslint-disable-next-line @typescript-eslint/brace-style
{
    public readonly kind = containerStepKind;

    public readonly moduleType = ContainerStep;

    public readonly profileType = ContainerStepProfile;

    public readonly isSource = false;

    public async run(
        _module: ContainerStep,
        profile: ContainerStepProfile,
        handle: EngineHandle,
    ): PromiseResult<ModuleOutput, Error> {
        const interpolationContext = handle.getInterpolationContext();

        const image = profile.source.interpolate(interpolationContext).try();

        let env: DockerEnv | undefined;
        if (profile.env !== undefined) {
            env = new Map();

            for (const [key, value] of profile.env) {
                env.set(key, value.interpolate(interpolationContext).try());
            }
        }

        let entrypoint: string | undefined;
        let args: DockerCommand | undefined;
        if (profile.command !== undefined) {
            args = [];

            for (const arg of profile.command) {
                args.push(arg.interpolate(interpolationContext).try());
            }

            if (profile.setEntrypoint) {
                entrypoint = args.shift();
            }
        }

        let volumes: DockerVolumes | undefined;
        if (profile.volumes !== undefined) {
            volumes = new Map();

            for (const [dest, source] of profile.volumes) {
                volumes.set(
                    dest.interpolate(interpolationContext).try(),
                    source.interpolate(interpolationContext).try(),
                );
            }
        }

        const runCommand = Docker.run({
            image,
            ports: profile.ports,
            env,
            entrypoint,
            args,
            volumes,
        });

        const runResult = (await handle.executeCommand(runCommand)).try();

        if (runResult.status !== 0) {
            return Result.Err(new Error('Docker run failed, see output'));
        }

        return Result.Ok({});
    }
}
