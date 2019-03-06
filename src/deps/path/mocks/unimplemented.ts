import { Path } from '..';
import { unimplemented } from '../../../util/container/mock';

export class UnimplementedPath implements Path {
    public delimiter: ':' | ';' = ':';
    public sep: '\\' | '/' = '/';

    public basename(): any {
        return unimplemented();
    }
    public dirname(): any {
        return unimplemented();
    }
    public extname(): any {
        return unimplemented();
    }
    public format(): any {
        return unimplemented();
    }
    public isAbsolute(): any {
        return unimplemented();
    }
    public join(): any {
        return unimplemented();
    }
    public normalize(): any {
        return unimplemented();
    }
    public parse(): any {
        return unimplemented();
    }
    public relative(): any {
        return unimplemented();
    }
    public resolve(): any {
        return unimplemented();
    }
}
