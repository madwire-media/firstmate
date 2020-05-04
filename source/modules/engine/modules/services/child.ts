import { Injectable } from '@madwire-media/di-container';
import { Result, PromiseResult } from '@madwire-media/result';
import { EngineModuleImpl, ModuleOutput } from '../..';
import {
    ChildServiceTypes, childServiceKind, ChildService, ChildServiceProfile,
} from '../../../config/types/services/child';
import { ExpressionContext } from '../../../config/types/common/interpolated-string';
import { VersionName } from '../../../config/types/common/config-names';

export type Dependencies = {};

export class ChildServiceImpl
    extends Injectable<Dependencies>
    implements EngineModuleImpl<ChildServiceTypes>
// eslint-disable-next-line @typescript-eslint/brace-style
{
    public readonly kind = childServiceKind;

    public readonly moduleType = ChildService;

    public readonly profileType = ChildServiceProfile;

    public readonly isSource = false;

    public async run(): PromiseResult<ModuleOutput, Error> {
        return Result.Ok({});
    }

    public async destroy(): PromiseResult<ModuleOutput, Error> {
        return Result.Ok({});
    }

    public setVersion(
        module: ChildService,
        profile: ChildServiceProfile,
        interpolationContext: ExpressionContext,
    ): Result<VersionName, Error> {
        if (profile.overrideVersion) {
            return profile.overrideVersion.interpolate(interpolationContext);
        } else {
            return module.version.interpolate(interpolationContext);
        }
    }
}
