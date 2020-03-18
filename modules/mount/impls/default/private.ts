import type {} from '@madwire-media/result-try';

import Path from 'path';

import { RequiresHttp } from '@madwire-media/http';
import { RequiresFs, FsPromiseResult } from '@madwire-media/fs';
import { Injectable, context } from '@madwire-media/di-container';
import { Result, PromiseResult } from '@madwire-media/result';
import { pipe } from '@madwire-media/pipe';

import { RequiresCacheHandle } from '../../../tmpfs';
import { MountRecord } from './types';

export interface RequiresMountPrivate {
    mountPrivate: MountPrivate;
}

export interface MountPrivate {
    isHttp(source: string): boolean;
    isMountedUnderneath(mounts: Iterable<string>, dest: string): boolean;
    writeMountRecord(record: MountRecord, name: string): FsPromiseResult<void>;
    readMountRecord(name: string): PromiseResult<MountRecord, Error>;
    deleteMountRecord(name: string): FsPromiseResult<void>;
    getMountRecords(): FsPromiseResult<string[]>;
    downloadFile(url: string, dest: string): PromiseResult<void, Error>;
}

type Dependencies =
    & RequiresFs
    & RequiresHttp
    & RequiresCacheHandle;

export class MountPrivateImpl extends Injectable<Dependencies> {
    public isHttp(source: string): boolean {
        return /^https?:\/\//.test(source);
    }

    public isMountedUnderneath(mounts: Iterable<string>, dest: string): boolean {
        const absDest = Path.resolve(dest);

        for (let mount of mounts) {
            mount = Path.resolve(mount);

            if (absDest === mount || absDest.startsWith(`${mount}${Path.sep}`)) {
                return true;
            }
        }

        return false;
    }

    public async writeMountRecord(record: MountRecord, name: string): FsPromiseResult<void> {
        const { cacheHandle } = this[context];

        const json = JSON.stringify(record);
        return cacheHandle.writeFile(name, json);
    }

    public async readMountRecord(name: string): PromiseResult<MountRecord, Error> {
        const { cacheHandle } = this[context];

        return Result.async(cacheHandle.readFile(name))
            .andThen(Result.wrapCallback(JSON.parse))
            .promise();
    }

    public async deleteMountRecord(name: string): FsPromiseResult<void> {
        const { cacheHandle } = this[context];

        return cacheHandle.deleteFileIfExists(name);
    }

    public async getMountRecords(): FsPromiseResult<string[]> {
        const { cacheHandle } = this[context];

        return cacheHandle.listFiles();
    }

    public async downloadFile(url: string, dest: string): PromiseResult<void, Error> {
        const { http, fs } = this[context];

        const httpResponse = await http.get(url).getResponse();

        const parentDir = Path.dirname(dest);

        if (!(await fs.exists(parentDir))) {
            (await fs.mkdirp(parentDir)).try();
        }

        const destStream = fs.createWriteStream(dest).try();

        return pipe(httpResponse)
            .to(destStream)
            .promise()
            .then(() => Result.voidOk, Result.Err);
    }
}
