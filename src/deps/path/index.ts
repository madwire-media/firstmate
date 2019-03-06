import { FormatInputPathObject, ParsedPath } from 'path';

export interface RequiresPath {
    path: Path;
}

export interface Path {
    delimiter: ':' | ';';
    sep: '\\' | '/';

    basename(path: string, ext?: string): string;
    dirname(path: string): string;
    extname(path: string): string;
    format(pathObject: FormatInputPathObject): string;
    isAbsolute(path: string): boolean;
    join(...paths: string[]): string;
    normalize(path: string): string;
    parse(path: string): ParsedPath;
    relative(from: string, to: string): string;
    resolve(...paths: string[]): string;
}
