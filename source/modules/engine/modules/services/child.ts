import { Injectable } from '@madwire-media/di-container';
import { Result } from '@madwire-media/result';
import { EngineModuleImpl } from '../..';
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
