import { PromiseResult } from '@madwire-media/result';
import { FsPromiseResult } from '@madwire-media/fs';

export interface RequiresCache {
    cache: Cache;
}

export interface RequiresCacheHandle {
    cacheHandle: CacheHandle;
}

export interface Cache {
    startup(): PromiseResult<void, Error>;
    shutdown(): PromiseResult<void, Error>;

    // Handlers _must_ be added before startup
    createHandle(fileType: string): CacheHandle;
    addHandler(
        handle: CacheHandle,
        handler: CacheCleanupHandler | CacheTransientHandler,
    ): void;
}

export interface CacheHandle {
    readonly tmpFileType: string;

    writeFile(name: string, value: string): FsPromiseResult<void>;
    readFile(name: string): FsPromiseResult<string>;
    deleteFile(name: string): FsPromiseResult<void>;
    deleteFileIfExists(name: string): FsPromiseResult<void>;
    listFiles(): FsPromiseResult<string[]>;

    generateUniqueName(): Promise<string>;
    nameToPath(name: string): string;
}

export interface CacheTransientHandler {
    readonly autoCleanTmpFiles: true;
}

export interface CacheCleanupHandler {
    readonly autoCleanTmpFiles: false;

    cleanup(files: string[]): PromiseResult<void, Error>;
}
