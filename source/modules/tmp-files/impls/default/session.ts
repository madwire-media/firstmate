import Path from 'path';
import { Injectable, context } from '@madwire-media/di-container';
import { RequiresFs } from '@madwire-media/fs';
import { PromiseResult, Result } from '@madwire-media/result';
import { TmpFilesSession } from '../..';
import { RequiresGenerate } from '../../../generate';

type Dependencies = RequiresFs & RequiresGenerate;

export class DefaultTmpFilesSession
    extends Injectable<Dependencies>
    implements TmpFilesSession
// eslint-disable-next-line @typescript-eslint/brace-style
{
    private readonly rootDir: string;

    private readonly tmpDir: string;

    private readonly lockFile: string;

    public readonly mainDir: string;

    private interval?: NodeJS.Timeout;

    constructor(deps: Dependencies, rootDir: string) {
        super(deps);

        this.rootDir = rootDir;
        this.mainDir = Path.join(rootDir, 'main');
        this.tmpDir = Path.join(rootDir, 'tmp');
        this.lockFile = Path.join(rootDir, 'lock');
    }

    public async init(): PromiseResult<void, Error> {
        const { fs } = this[context];

        if (this.interval !== undefined) {
            throw new Error('Already initialized tmp files session');
        }

        (await fs.mkdirp(this.mainDir)).try();
        (await fs.mkdirp(this.tmpDir)).try();

        (await fs.write(this.lockFile, '')).try();

        this.interval = setInterval(this.updateLockfile.bind(this), 30000);

        return Result.voidOk;
    }

    public async createNewArtifactDir(): PromiseResult<string, Error> {
        const { fs, generate } = this[context];

        let dirName = generate.uniqueTmpFile();
        let dirPath = Path.join(this.tmpDir, dirName);

        // eslint-disable-next-line no-await-in-loop
        while (await fs.exists(dirPath)) {
            dirName = generate.uniqueTmpFile();
            dirPath = Path.join(this.tmpDir, dirName);
        }

        (await fs.mkdir(dirPath)).try();

        return Result.Ok(dirPath);
    }

    public cleanup(): PromiseResult<void, Error> {
        const { fs } = this[context];

        if (this.interval === undefined) {
            throw new Error('Uninitialized tmp files session');
        }

        clearInterval(this.interval);
        this.interval = undefined;

        return fs.remove(this.rootDir);
    }

    private updateLockfile() {
        const { fs } = this[context];

        // It's not a critical issue if this fails
        // TODO: add a logging/notification system for when this fails
        fs.write(this.lockFile, '');
    }
}
