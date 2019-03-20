import { PromiseResult, Result } from '../../util/result';
import { ConcurrencyOptions } from '../concurrently';
import { OsError, OsErrorProps } from '../os';

export type FileMutator = (from: string, to: string) => NodeJS.ReadWriteStream;
export type WalkCallback = (relpath: string, isDir: boolean) => void | FsPromiseResult<void>;

export interface Stats {
    isDirectory(): boolean;
    getMode(): number;
}

export type WalkOptions = ConcurrencyOptions;
export const defaultWalkOptions: Required<WalkOptions> = {
    concurrency: 16,
};

export interface CopyOptions extends WalkOptions {
    mutator?: FileMutator | false;
    clobber?: boolean;
}
export const defaultCopyOptions: Required<CopyOptions> = {
    ...defaultWalkOptions,

    mutator: false,
    clobber: false,
};

export interface RequiresFsBasic {
    fsBasic: FsBasic;
}
export interface RequiresFs {
    fs: Fs;
}

export abstract class FsResult<T> extends Result<T, FsError> {}
export type FsPromiseResult<T> = PromiseResult<T, FsError>;

export interface FsBasic {
    chmod(path: string, mode: number): FsPromiseResult<void>;
    createReadStream(path: string): NodeJS.ReadableStream;
    createWriteStream(path: string): NodeJS.WritableStream;
    deleteFile(path: string): FsPromiseResult<void>;
    deleteDir(path: string): FsPromiseResult<void>;
    exists(path: string): Promise<boolean>;
    mkdir(path: string): FsPromiseResult<void>;
    read(path: string): FsPromiseResult<string>;
    readdir(directory: string): FsPromiseResult<string[]>;
    rename(from: string, to: string): FsPromiseResult<void>;
    stat(path: string): FsPromiseResult<Stats>;
    write(path: string, contents: string): FsPromiseResult<void>;
}

export interface Fs extends FsBasic {
    copy(from: string, to: string, opts?: CopyOptions): FsPromiseResult<void>;
    copyFile(from: string, to: string, opts?: CopyOptions & WalkOptions): FsPromiseResult<void>;
    mkdirp(path: string): FsPromiseResult<void>;
    remove(path: string, opts?: WalkOptions): FsPromiseResult<void>;
    walkDown(path: string, cb: WalkCallback, opts?: WalkOptions): FsPromiseResult<void>;
    walkUp(path: string, cb: WalkCallback, opts?: WalkOptions): FsPromiseResult<void>;
}

export interface FsErrorProps extends OsErrorProps {
    path?: string;
}

export class FsError extends OsError {
    public readonly name = 'FsError';

    public inner: Error | FsErrorProps;

    public path?: string;

    constructor(inner: Error | FsErrorProps) {
        super(inner);

        this.inner = inner;

        if ('path' in inner) {
            this.path = inner.path;
        }
    }

    public isAccessDenied(): boolean {
        return this.code === 'EACCES';
    }

    public isFileExists(): boolean {
        return this.code === 'EEXIST';
    }

    public isIsDir(): boolean {
        return this.code === 'EISDIR';
    }

    public isMaxOpenFiles(): boolean {
        return this.code === 'EMFILE';
    }

    public isNoSuchFile(): boolean {
        return this.code === 'ENOENT';
    }

    public isNotADirectory(): boolean {
        return this.code === 'ENOTDIR';
    }

    public isDirectoryNotEmpty(): boolean {
        return this.code === 'ENOTEMPTY';
    }
}
