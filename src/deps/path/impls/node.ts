import * as path from 'path';
import { Path } from '..';

// export const NodePath: Path = path;
export class NodePath implements Path {
    public delimiter = path.delimiter;
    public sep = path.sep;

    public basename = path.basename;
    public dirname = path.dirname;
    public extname = path.extname;
    public format = path.format;
    public isAbsolute = path.isAbsolute;
    public join = path.join;
    public normalize = path.normalize;
    public parse = path.parse;
    public relative = path.relative;
    public resolve = path.resolve;
}
