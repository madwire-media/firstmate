import * as fs from 'fs';

import { FsBasic, FsError, FsPromiseResult, FsResult, Stats } from '..';
import { Result } from '../../../util/result';

export class NativeStats implements Stats {
    private readonly stats: fs.Stats;

    constructor(stats: fs.Stats) {
        this.stats = stats;
    }

    public isDirectory(): boolean {
        return this.stats.isDirectory();
    }

    public getMode(): number {
        return this.stats.mode;
    }
}

const intoFsErr = Result.mapToErr((error: any) => new FsError(error));

export class NativeFs implements FsBasic {
    public chmod(path: string, mode: number): FsPromiseResult<void> {
        return fs.promises.chmod(path, mode)
            .then(Result.Ok, intoFsErr);
    }

    public createReadStream(path: string): FsResult<NodeJS.ReadableStream> {
        return Result.fromCallback(() => fs.createReadStream(path))
            .mapErr((error) => new FsError(error));
    }

    public createWriteStream(path: string): FsResult<NodeJS.WritableStream> {
        return Result.fromCallback(() => fs.createWriteStream(path))
            .mapErr((error) => new FsError(error));
    }

    public deleteFile(path: string): FsPromiseResult<void> {
        return fs.promises.unlink(path)
            .then(Result.Ok, intoFsErr);
    }

    public deleteDir(path: string): FsPromiseResult<void> {
        return fs.promises.rmdir(path)
            .then(Result.Ok, intoFsErr);
    }

    public exists(path: string): Promise<boolean> {
        return fs.promises.access(path)
            .then(
                () => true,
                () => false,
            );
    }

    public mkdir(path: string): FsPromiseResult<void> {
        return fs.promises.mkdir(path)
            .then(Result.Ok, intoFsErr);
    }

    public read(path: string): FsPromiseResult<string> {
        return fs.promises.readFile(path, 'utf8')
            .then(Result.Ok, intoFsErr);
    }

    public readdir(path: string): FsPromiseResult<string[]> {
        return fs.promises.readdir(path)
            .then(Result.Ok, intoFsErr);
    }

    public rename(from: string, to: string): FsPromiseResult<void> {
        return fs.promises.rename(from, to)
            .then(Result.Ok, intoFsErr);
    }

    public stat(path: string): FsPromiseResult<NativeStats> {
        return fs.promises.stat(path)
            .then(Result.mapToOk((stats) => new NativeStats(stats)), intoFsErr);
    }

    public write(path: string, contents: string): FsPromiseResult<void> {
        return fs.promises.writeFile(path, contents)
            .then(Result.Ok, intoFsErr);
    }
}
