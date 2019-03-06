import * as Path from 'path';

import {
    CopyOptions, defaultCopyOptions, defaultWalkOptions, Fs, FsError,
    RequiresFsBasic, WalkCallback, WalkOptions,
} from '..';
import { Injectable } from '../../../util/container/injectable';
import { context } from '../../../util/container/symbols';
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
    public async copy(from: string, to: string, opts?: CopyOptions): Promise<void> {
        if (!await this.exists(Path.dirname(to))) {
            throw new FsError({
                code: 'ENOENT',
                message: 'Cannot copy into nonexistent directory',
                path: to,
            });
        }

        await this.walkDown(
            from,
            async (relpath, isDir) => {
                if (isDir) {
                    await this.mkdirp(Path.join(to, relpath));
                } else {
                    await this.copyFile(
                        Path.join(from, relpath),
                        Path.join(to, relpath),
                        opts,
                    );
                }
            },
            opts,
        );
    }

    public async copyFile(from: string, to: string, customOpts: CopyOptions): Promise<void> {
        const opts = {...defaultCopyOptions, ...customOpts};

        if (await this.exists(to)) {
            if (opts.clobber) {
                await this.remove(to);
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

    public async mkdirp(path: string): Promise<void> {
        const parts = Path.normalize(path).split(Path.sep);
        let partial: string;

        for (const part of parts) {
            if (partial === undefined) {
                partial = part;
            } else {
                partial = Path.join(part);
            }

            if (partial !== '') {
                try {
                    const stats = await this.stat(partial);

                    if (!stats.isDirectory()) {
                        throw new FsError({
                            code: 'ENOTDIR',
                            message: 'Cannot make directory in place of file',
                            path: partial,
                        });
                    }
                } catch {
                    await this.mkdir(partial);
                }
            }
        }
    }

    public async remove(path: string, opts?: WalkOptions): Promise<void> {
        this.walkUp(
            path,
            async (relpath, isdir) => {
                const fullpath = Path.join(path, relpath);

                if (isdir) {
                    await this.deleteDir(fullpath);
                } else {
                    await this.deleteFile(fullpath);
                }
            },
            opts,
        );
    }

    public async walkDown(path: string, cb: WalkCallback, customOpts?: WalkOptions): Promise<void> {
        const opts = {...defaultWalkOptions, ...customOpts};

        await this[context].concurrently(
            ['.'],
            async (relpath) => {
                const fullpath = Path.join(path, relpath);
                let newPaths: string[] | undefined;

                const stats = await this.stat(fullpath);

                if (stats.isDirectory()) {
                    const newFilenames = await this.readdir(fullpath);

                    newPaths = newFilenames.map((filename) => Path.join(relpath, filename));
                }

                await cb(relpath, stats.isDirectory());

                return newPaths;
            },
            opts.concurrency,
        );
    }

    public async walkUp(path: string, cb: WalkCallback, customOpts?: WalkOptions): Promise<void> {
        const opts = {...defaultWalkOptions, ...customOpts};

        const filesLeftInDir: {[dir: string]: number} = {};

        await this[context].concurrently(
            ['.'],
            async (relpath) => {
                const fullpath = Path.join(path, relpath);
                let newPaths: string[] | undefined;

                const stats = await this.stat(fullpath);

                if (stats.isDirectory()) {
                    const newFilenames = await this.readdir(fullpath);

                    filesLeftInDir[relpath] = newFilenames.length;
                    newPaths = newFilenames.map((filename) => Path.join(relpath, filename));
                } else {
                    await cb(relpath, false);

                    let dirname = Path.dirname(relpath);
                    filesLeftInDir[dirname]--;

                    while (filesLeftInDir[dirname] === 0) {
                        await cb(dirname, true);
                        dirname = Path.dirname(dirname);
                    }
                }

                return newPaths;
            },
            opts.concurrency,
        );
    }
}
