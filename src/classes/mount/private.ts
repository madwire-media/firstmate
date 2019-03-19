import { FsError, RequiresFs } from '../../deps/fs';
import { RequiresHttp } from '../../deps/http';
import { RequiresPath } from '../../deps/path';
import { RequiresProcess } from '../../deps/process';
import { context, Injectable } from '../../util/container';
import { defer } from '../../util/promise';

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

    public async writeMountRecord(record: MountRecord, name: string): Promise<void> {
        const {fs} = this[context];

        const hjson = JSON.stringify(record);
        await fs.write(`.fm/${name}.mount`, hjson);
    }

    public async readMountRecord(name: string): Promise<MountRecord> {
        const {fs} = this[context];

        const hjson = await fs.read(`.fm/${name}.mount`);
        return JSON.parse(hjson);
    }

    public async downloadFile(url: string, dest: string): Promise<void> {
        const {http, fs, path} = this[context];

        const {promise, resolve, reject} = defer();
        const httpResponse = await http.get(url).getResponse();

        const parentDir = path.dirname(dest);

        if (!(await fs.exists(parentDir))) {
            await fs.mkdirp(parentDir);
        }

        httpResponse
            .pipe(fs.createWriteStream(dest))
            .on('finish', resolve)
            .on('error', reject);

        await promise;
    }

    public async getMountIds(): Promise<number[]> {
        const {fs} = this[context];

        return (await fs.readdir('.fm'))
                .filter((s) => s.endsWith('.mount'))
                .map((s) => s.slice(0, -6))
                .filter((s) => s.length > 0)
                .map((s) => +s)
                .filter((s) => !isNaN(s))
                .sort((a, b) => a - b);
    }

    public async hasDotFm(): Promise<boolean> {
        const {fs} = this[context];

        try {
            const stats = await fs.stat('.fm');

            return stats.isDirectory();
        } catch (error) {
            if (error instanceof FsError && error.isNoSuchFile()) {
                return false;
            } else {
                throw error;
            }
        }
    }

    public async ensureDotFm(): Promise<void> {
        const {fs} = this[context];

        try {
            const stats = await fs.stat('.fm');

            if (!stats.isDirectory()) {
                await fs.remove('.fm');
                await fs.mkdir('.fm');
            }
        } catch (error) {
            if (error instanceof FsError && error.isNoSuchFile()) {
                await fs.mkdirp('.fm');
            } else {
                throw error;
            }
        }
    }
}
