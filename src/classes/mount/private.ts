import { FsPromiseResult, RequiresFs } from '../../deps/fs';
import { RequiresHttp } from '../../deps/http';
import { RequiresPath } from '../../deps/path';
import { RequiresProcess } from '../../deps/process';
import { context, Injectable } from '../../util/container';
import { defer } from '../../util/promise';
import { PromiseResult, Result } from '../../util/result';

export interface RequiresFmMountHelper {
    mountPrivate: MountPrivate;
}

type Dependencies = RequiresFs & RequiresHttp & RequiresPath & RequiresProcess;

export interface MountRecord {
    dest: string;
    replaced: string | false;
}

export class MountPrivate extends Injectable<Dependencies> {
    public isHttp(source: string): boolean {
        return /^https?:\/\//.test(source);
    }

    public toRelativePath(input: string): string {
        const {process, path} = this[context];

        return path.relative(process.cwd(), path.resolve(input));
    }

    public isMountedUnderneath(mounts: Iterable<string>, dest: string): boolean {
        const {path} = this[context];

        dest = path.resolve(dest);

        for (let mount of mounts) {
            mount = path.resolve(mount);

            if (dest === mount || dest.startsWith(`${mount}/`)) {
                return true;
            }
        }

        return false;
    }

    public generateRandomName(len: number): string {
        const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+=';
        let name = '';

        for (let i = 0; i < len; i++) {
            name += chars[Math.floor(Math.random() * chars.length)];
        }

        return name;
    }

    public async generateMountFilename(): Promise<string> {
        const {fs} = this[context];

        let name: string;

        do {
            name = this.generateRandomName(16);
        } while (await fs.exists(`.fm/${name}`));

        return name;
    }

    public async writeMountRecord(record: MountRecord, name: string): FsPromiseResult<void> {
        const {fs} = this[context];

        const hjson = JSON.stringify(record);
        return fs.write(`.fm/${name}.mount`, hjson);
    }

    public async readMountRecord(name: string): FsPromiseResult<MountRecord> {
        const {fs} = this[context];

        return Result.async(fs.read(`.fm/${name}.mount`))
            .map(JSON.parse);
    }

    public async downloadFile(url: string, dest: string): PromiseResult<void, Error> {
        const {http, fs, path} = this[context];

        const {promise, resolve, reject} = defer<void>();
        const httpResponse = await http.get(url).getResponse();

        const parentDir = path.dirname(dest);

        if (!(await fs.exists(parentDir))) {
            const mkdirpResult = await fs.mkdirp(parentDir);
            if (mkdirpResult.isErr()) {
                return mkdirpResult;
            }
        }

        httpResponse
            .pipe(fs.createWriteStream(dest))
            .on('finish', resolve)
            .on('error', reject);

        return Result.fromPromise(promise);
    }

    public async getMountIds(): FsPromiseResult<number[]> {
        const {fs} = this[context];

        return (await fs.readdir('.fm'))
            .map((readdir) => readdir
                .filter((s) => s.endsWith('.mount'))
                .map((s) => s.slice(0, -6))
                .filter((s) => s.length > 0)
                .map((s) => +s)
                .filter((s) => !isNaN(s))
                .sort((a, b) => a - b),
            );
    }

    public async hasDotFm(): Promise<boolean> {
        const {fs} = this[context];

        return fs.exists('.fm');
    }

    public async ensureDotFm(): FsPromiseResult<void> {
        const {fs} = this[context];

        return Result.async(fs.stat('.fm'))
            .then(
                (stats) => {
                    if (stats.isDirectory()) {
                        return Result.async(fs.remove('.fm'))
                            .andThen(() => fs.mkdir('.fm'))
                            .promise();
                    } else {
                        return Result.voidOk;
                    }
                },
                (error) => {
                    if (error.isNoSuchFile()) {
                        return fs.mkdirp('.fm');
                    } else {
                        return Result.Err(error);
                    }
                },
            ).promise();
    }
}
