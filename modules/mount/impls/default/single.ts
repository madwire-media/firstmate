import Path from 'path';

import { PromiseResult, Result } from '@madwire-media/result';
import { FsError, RequiresFs, FsPromiseResult } from '@madwire-media/fs';
import { Injectable, context } from '@madwire-media/di-container';

import { RequiresMountPrivate } from './private';
import { MountRecord } from './types';
import { RequiresCacheHandle } from '../../../tmpfs';
import { RequiresEnv } from '../../../env';
import { RequiresLogger } from '../../../logger';
import { lt } from '../../../logger/types';

export interface SingleMounter {
    mountFile(source: string, dest: string): PromiseResult<MountRecord | undefined, Error>;
    unmountFile(mount: MountRecord): PromiseResult<void, FsError>;
}

export interface RequiresSingleMounter {
    singleMounter: SingleMounter;
}

type Dependencies =
    & RequiresFs
    & RequiresMountPrivate
    & RequiresCacheHandle
    & RequiresEnv
    & RequiresLogger;

export class SingleMounterImpl extends Injectable<Dependencies> {
    private readonly mounts = new Set<string>();

    private mountCount = 0;

    public async mountFile(
        source: string,
        dest: string,
    ): PromiseResult<MountRecord | undefined, FsError | Error> {
        const {
            fs, mountPrivate, cacheHandle, env, logger,
        } = this[context];

        logger.trace`Copying ${lt.path(source)} to ${lt.path(dest)}`;

        const relDest = env.toPwdRelative(dest);
        let relSource = source;

        const isHttp = mountPrivate.isHttp(source);

        if (!isHttp) {
            relSource = env.toPwdRelative(source);

            if (!await fs.exists(relSource)) {
                return Result.Err(
                    new FsError({
                        code: 'ENOENT',
                        message: 'Cannot copy nonexistent file',
                        path: source,
                    }),
                );
            }
        }

        const mountedUnderneath = mountPrivate.isMountedUnderneath(this.mounts, dest);
        let destExists = await fs.exists(relDest);

        if (!destExists) {
            (await fs.mkdirp(Path.dirname(relDest))).try();
        }

        let record: MountRecord | undefined;

        if (!mountedUnderneath) {
            if (destExists) {
                // Generate name
                const replaced = await cacheHandle.generateUniqueName();

                // Save manifest
                this.mountCount += 1;
                record = {
                    dest,
                    replaced,
                };

                (
                    await mountPrivate.writeMountRecord(record, this.mountCount.toString())
                ).try();

                // Move original contents
                {
                    const newDest = env.toPwdRelative(
                        cacheHandle.nameToPath(replaced),
                    );

                    const result = await fs.rename(relDest, newDest);

                    if (result.isErr()) {
                        await mountPrivate.deleteMountRecord(this.mountCount.toString());

                        return result;
                    }
                }

                destExists = false;
            } else {
                // Save manifest
                this.mountCount += 1;
                record = {
                    dest,
                    replaced: false,
                };

                (
                    await mountPrivate.writeMountRecord(record, this.mountCount.toString())
                ).try();
            }

            this.mounts.add(dest);
        }

        if (destExists) {
            (await fs.remove(relDest)).try();
        }

        if (isHttp) {
            (await mountPrivate.downloadFile(source, relDest)).try();
        } else {
            (await fs.copy(relSource, relDest)).try();
        }

        return Result.Ok(record);
    }

    public async unmountFile(mount: MountRecord): FsPromiseResult<void> {
        const {
            fs, env, cacheHandle, logger,
        } = this[context];

        logger.trace`Resetting ${lt.path(mount.dest)}`;

        const { dest, replaced } = mount;
        const relDest = env.toPwdRelative(dest);

        if (await fs.exists(relDest)) {
            (await fs.remove(relDest)).try();
        }

        if (replaced) {
            const movedFile = env.toPwdRelative(
                cacheHandle.nameToPath(replaced),
            );

            (await fs.rename(movedFile, relDest)).try();
        }

        return Result.voidOk;
    }
}
