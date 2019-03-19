import { Mount } from '.';
import { Injectable, unimplementedFn } from '../../util/container';

export class UnimplementedMount extends Injectable<{}> implements Mount {
    public copyFiles = unimplementedFn('copyFiles');
    public generateMountsScript = unimplementedFn('generateMountsScript');
    public mount = unimplementedFn('mount');
    public uncopyFiles = unimplementedFn('uncopyFiles');
    public unmount = unimplementedFn('unmount');
}
