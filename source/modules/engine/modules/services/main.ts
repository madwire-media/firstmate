import { Injectable } from '@madwire-media/di-container';
import { Result } from '@madwire-media/result';
import { EngineModuleImpl } from '../..';
import {
    MainServiceTypes, MainService, MainServiceProfile, mainServiceKind,
} from '../../../config/types/services/main';
import { ExpressionContext } from '../../../config/types/common/interpolated-string';
import { VersionName } from '../../../config/types/common/config-names';

export type Dependencies = {};

export class MainServiceImpl
    extends Injectable<Dependencies>
    implements EngineModuleImpl<MainServiceTypes>
// eslint-disable-next-line @typescript-eslint/brace-style
{
    public readonly kind = mainServiceKind;

    public readonly moduleType = MainService;

    public readonly profileType = MainServiceProfile;

    public readonly isSource = false;

    public setVersion(
        module: MainService,
        profile: MainServiceProfile,
        interpolationContext: ExpressionContext,
    ): Result<VersionName, Error> {
        if (profile.overrideVersion) {
            return profile.overrideVersion.interpolate(interpolationContext);
        } else {
            return Result.Ok(module.version);
        }
    }
}
