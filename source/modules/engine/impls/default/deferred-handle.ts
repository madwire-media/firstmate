import { Injectable } from '@madwire-media/di-container';
import { RequiresFs } from '@madwire-media/fs';
import { EngineHandleDeferred } from '../..';
import { ExpressionContext } from '../../../config/types/common/interpolated-string';

type Dependencies = RequiresFs;

export class DefaultDeferredEngineHandle
    extends Injectable<Dependencies>
    implements EngineHandleDeferred
// eslint-disable-next-line @typescript-eslint/brace-style
{
    public getInterpolationContext(): ExpressionContext {
        throw new Error('Method not implemented.');
    }

    public registerCancelHandler(/* handler: () => PromiseResult<void, Error> */): void {
        throw new Error('Method not implemented.');
    }
}
