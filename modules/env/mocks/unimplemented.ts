import { unimplementedFn } from '@madwire-media/di-container';
import { Env } from '..';

export class UnimplementedEnv implements Env {
    public toPwdRelative = unimplementedFn('toPwdRelative');

    constructor(public readonly projectRoot: string) {}
}
