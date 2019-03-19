import { Path } from '..';
import { unimplementedFn } from '../../../util/container/mock';

export class UnimplementedPath implements Path {
    public delimiter: ':' | ';' = ':';
    public sep: '\\' | '/' = '/';

    public basename = unimplementedFn('basename');
    public dirname = unimplementedFn('dirname');
    public extname = unimplementedFn('extname');
    public format = unimplementedFn('format');
    public isAbsolute = unimplementedFn('isAbsolute');
    public join = unimplementedFn('join');
    public normalize = unimplementedFn('normalize');
    public parse = unimplementedFn('parse');
    public relative = unimplementedFn('relative');
    public resolve = unimplementedFn('resolve');
}
