import { unimplementedFn } from '@madwire-media/di-container';

import { Cache, CacheHandle } from '..';

export class UnimplementedCache implements Cache {
    public startup = unimplementedFn('startup');

    public shutdown = unimplementedFn('shutdown');

    public addHandler = unimplementedFn('addHandler');

    public createHandle = unimplementedFn('createHandle');
}

export class UnimplementedCacheHandle implements CacheHandle {
    constructor(public readonly tmpFileType: string) {}

    public deleteFile = unimplementedFn('deleteFile');

    public deleteFileIfExists = unimplementedFn('deleteFileIfExists');

    public generateUniqueName = unimplementedFn('generateUniqueName');

    public nameToPath = unimplementedFn('nameToPath');

    public readFile = unimplementedFn('readFile');

    public writeFile = unimplementedFn('writeFile');

    public listFiles = unimplementedFn('listFiles');
}
