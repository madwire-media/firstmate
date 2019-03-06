import * as fs from 'fs';

import { FsBasic, FsError, Stats } from '..';

export class NativeStats implements Stats {
    private stats: fs.Stats;

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

const intoFsError = (error: Error) => Promise.reject(new FsError(error));

export class NativeFs implements FsBasic {
    public chmod(path: string, mode: number): Promise<void> {
        return fs.promises.chmod(path, mode)
            .catch(intoFsError);
    }

    public createReadStream(path: string): NodeJS.ReadableStream {
        try {
            return fs.createReadStream(path);
        } catch (error) {
            throw new FsError(error);
        }
    }

    public createWriteStream(path: string): NodeJS.WritableStream {
        try {
            return fs.createWriteStream(path);
        } catch (error) {
            throw new FsError(error);
        }
    }

    public deleteFile(path: string): Promise<void> {
        return fs.promises.unlink(path)
            .catch(intoFsError);
    }

    public deleteDir(path: string): Promise<void> {
        return fs.promises.rmdir(path)
            .catch(intoFsError);
    }

    public exists(path: string): Promise<boolean> {
        return fs.promises.access(path)
            .then(
                () => true,
                () => false,
            );
    }

    public mkdir(path: string): Promise<void> {
        return fs.promises.mkdir(path)
            .catch(intoFsError);
    }

    public read(path: string): Promise<string> {
        return fs.promises.readFile(path, 'utf8')
            .catch(intoFsError);
    }

    public readdir(path: string): Promise<string[]> {
        return fs.promises.readdir(path)
            .catch(intoFsError);
    }

    public rename(from: string, to: string): Promise<void> {
        return fs.promises.rename(from, to)
            .catch(intoFsError);
    }

    public stat(path: string): Promise<NativeStats> {
        return fs.promises.stat(path)
            .catch(intoFsError)
            .then((nodeStats) => new NativeStats(nodeStats));
    }

    public write(path: string, contents: string): Promise<void> {
        return fs.promises.writeFile(path, contents)
            .catch(intoFsError);
    }
}
