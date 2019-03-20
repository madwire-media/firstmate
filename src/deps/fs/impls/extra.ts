import * as Path from 'path';

import {
    CopyOptions, defaultCopyOptions, defaultWalkOptions, Fs, FsError,
    FsPromiseResult, RequiresFsBasic, WalkCallback, WalkOptions,
} from '..';
import { Injectable } from '../../../util/container/injectable';
import { context } from '../../../util/container/symbols';
import { Result } from '../../../util/result';
import { RequiresConcurrently } from '../../concurrently';

type Dependencies = RequiresFsBasic & RequiresConcurrently;

export class ExtraFs extends Injectable<Dependencies> implements Fs {
    // ------------------------------ Inherited ----------------------------- //
    public chmod             = this[context].fsBasic.chmod;
    public createReadStream  = this[context].fsBasic.createReadStream;
    public createWriteStream = this[context].fsBasic.createWriteStream;
    public deleteFile        = this[context].fsBasic.deleteFile;
    public deleteDir         = this[context].fsBasic.deleteDir;
    public exists            = this[context].fsBasic.exists;
    public mkdir             = this[context].fsBasic.mkdir;
    public read              = this[context].fsBasic.read;
    public readdir           = this[context].fsBasic.readdir;
    public rename            = this[context].fsBasic.rename;
    public stat              = this[context].fsBasic.stat;
    public write             = this[context].fsBasic.write;

    // ------------------------------- Methods ------------------------------ //
    public async copy(from: string, to: string, opts?: CopyOptions): FsPromiseResult<void> {
        if (!await this.exists(Path.dirname(to))) {
            return Result.Err(
                new FsError({
                    code: 'ENOENT',
                    message: 'Cannot copy into nonexistent directory',
                    path: to,
                }),
            );
        }

        return this.walkDown(
            from,
            async (relpath, isDir) => {
                if (isDir) {
                    return this.mkdirp(Path.join(to, relpath));
                } else {
                    return this.copyFile(
                        Path.join(from, relpath),
                        Path.join(to, relpath),
                        opts,
                    );
                }
            },
            opts,
        );
    }

    public async copyFile(from: string, to: string, customOpts?: CopyOptions): FsPromiseResult<void> {
        const opts = {...defaultCopyOptions, ...customOpts};

        if (await this.exists(to)) {
            if (opts.clobber) {
                return this.remove(to);
            } else {
                throw new FsError({
                    code: 'EEXIST',
                    message: 'Cannot copy over existing file',
                    path: to,
                });
            }
        }

        const fromStream = this.createReadStream(from);
        const toStream = this.createWriteStream(to);

        if (opts.mutator !== false) {
            const transformStream = opts.mutator(from, to);

            fromStream.pipe(transformStream).pipe(toStream);
        } else {
            fromStream.pipe(toStream);
        }

        return new Promise((resolve, reject) => {
            toStream.on('error', (error) => reject(new FsError(error)));
            toStream.on('end', () => resolve());
        });
    }

    public async mkdirp(path: string): FsPromiseResult<void> {
        const parts = Path.normalize(path).split(Path.sep);
        let partial: string | undefined;

        for (const part of parts) {
            if (partial === undefined) {
                partial = part;
            } else {
                partial = Path.join(part);
            }

            if (partial !== '') {
                const stats = await this.stat(partial);

                if (stats.isOk()) {
                    if (!stats.value.isDirectory()) {
                        return Result.Err(
                            new FsError({
                                code: 'ENOTDIR',
                                message: 'Cannot make directory in place of file',
                                path: partial,
                            }),
                        );
                    }
                }

                return this.mkdir(partial);
            }
        }

        return Result.voidOk;
    }

    public async remove(path: string, opts?: WalkOptions): FsPromiseResult<void> {
        return this.walkUp(
            path,
            async (relpath, isdir) => {
                const fullpath = Path.join(path, relpath);

                if (isdir) {
                    return this.deleteDir(fullpath);
                } else {
                    return this.deleteFile(fullpath);
                }
            },
            opts,
        );
    }

    public async walkDown(path: string, cb: WalkCallback, customOpts?: WalkOptions): FsPromiseResult<void> {
        const opts = {...defaultWalkOptions, ...customOpts};

        return this[context].concurrently(
            ['.'],
            async (relpath) => {
                const fullpath = Path.join(path, relpath);
                let newPaths: string[] | void;

                const statsResult = await this.stat(fullpath);
                if (statsResult.isErr()) {
                    return statsResult;
                }

                if (statsResult.value.isDirectory()) {
                    const readdirResult = await this.readdir(fullpath);
                    if (readdirResult.isErr()) {
                        return readdirResult;
                    }

                    newPaths = readdirResult.value.map((filename) => Path.join(relpath, filename));
                }

                const cbResult = await cb(relpath, statsResult.value.isDirectory());
                if (cbResult && cbResult.isErr()) {
                    return cbResult;
                }

                return Result.Ok(newPaths);
            },
            opts.concurrency,
        );
    }

    public async walkUp(path: string, cb: WalkCallback, customOpts?: WalkOptions): FsPromiseResult<void> {
        const opts = {...defaultWalkOptions, ...customOpts};

        const filesLeftInDir: {[dir: string]: number} = {};

        return this[context].concurrently(
            ['.'],
            async (relpath) => {
                const fullpath = Path.join(path, relpath);
                let newPaths: string[] | undefined;

                const statsResult = await this.stat(fullpath);
                if (statsResult.isErr()) {
                    return statsResult;
                }

                if (statsResult.value.isDirectory()) {
                    const readdirResult = await this.readdir(fullpath);
                    if (readdirResult.isErr()) {
                        return readdirResult;
                    }

                    filesLeftInDir[relpath] = readdirResult.value.length;
                    newPaths = readdirResult.value.map((filename) => Path.join(relpath, filename));
                } else {
                    let result = await cb(relpath, false);
                    if (result && result.isErr()) {
                        return result;
                    }

                    let dirname = Path.dirname(relpath);
                    filesLeftInDir[dirname]--;

                    while (filesLeftInDir[dirname] === 0) {
                        result = await cb(dirname, true);
                        if (result && result.isErr()) {
                            return result;
                        }

                        dirname = Path.dirname(dirname);
                    }
                }

                return Result.Ok(newPaths);
            },
            opts.concurrency,
        );
    }
}
