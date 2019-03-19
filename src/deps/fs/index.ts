import { ConcurrencyOptions } from '../concurrently';
import { OsError, OsErrorProps } from '../os';

export type FileMutator = (from: string, to: string) => NodeJS.ReadWriteStream;
export type WalkCallback = (relpath: string, isDir: boolean) => void | Promise<void>;

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

export interface FsBasic {
    chmod(path: string, mode: number): Promise<void>;
    createReadStream(path: string): NodeJS.ReadableStream;
    createWriteStream(path: string): NodeJS.WritableStream;
    deleteFile(path: string): Promise<void>;
    deleteDir(path: string): Promise<void>;
    exists(path: string): Promise<boolean>;
    mkdir(path: string): Promise<void>;
    read(path: string): Promise<string>;
    readdir(directory: string): Promise<string[]>;
    rename(from: string, to: string): Promise<void>;
    stat(path: string): Promise<Stats>;
    write(path: string, contents: string): Promise<void>;
}

export interface Fs extends FsBasic {
    copy(from: string, to: string, opts?: CopyOptions): Promise<void>;
    copyFile(from: string, to: string, opts?: CopyOptions & WalkOptions): Promise<void>;
    mkdirp(path: string): Promise<void>;
    remove(path: string, opts?: WalkOptions): Promise<void>;
    walkDown(path: string, cb: WalkCallback, opts?: WalkOptions): Promise<void>;
    walkUp(path: string, cb: WalkCallback, opts?: WalkOptions): Promise<void>;
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
