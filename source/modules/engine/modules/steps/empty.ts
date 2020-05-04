import { Injectable } from '@madwire-media/di-container';
import { PromiseResult, Result } from '@madwire-media/result';
import { EngineModuleImpl, EngineHandle, MapModuleOutput } from '../..';
import {
    EmptyStepTypes, EmptyStep, EmptyStepProfile, emptyStepKind,
} from '../../../config/types/steps/empty';

export type Dependencies = {};

export class EmptyStepImpl
    extends Injectable<Dependencies>
    implements EngineModuleImpl<EmptyStepTypes>
// eslint-disable-next-line @typescript-eslint/brace-style
{
    public readonly kind = emptyStepKind;

    public readonly moduleType = EmptyStep;

    public readonly profileType = EmptyStepProfile;

    public readonly isSource = false;

    public async run(
        _module: EmptyStep,
        profile: EmptyStepProfile,
        handle: EngineHandle,
    ): PromiseResult<MapModuleOutput, Error> {
        const interpolationContext = handle.getInterpolationContext();

        const outputs = new Map();

        if (profile.outputs !== undefined) {
            for (const [key, value] of profile.outputs) {
                outputs.set(key, value.interpolate(interpolationContext).try());
            }
        }

        return Result.Ok(outputs);
    }

    public async destroy(
        _module: EmptyStep,
        profile: EmptyStepProfile,
        handle: EngineHandle,
    ): PromiseResult<MapModuleOutput, Error> {
        const interpolationContext = handle.getInterpolationContext();

        const outputs = new Map();

        if (profile.outputs !== undefined) {
            for (const [key, value] of profile.outputs) {
                outputs.set(key, value.interpolate(interpolationContext).try());
            }
        }

        return Result.Ok(outputs);
    }
}
