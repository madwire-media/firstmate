import Path from 'path';
import { Injectable, context } from '@madwire-media/di-container';
import { RequiresFs } from '@madwire-media/fs';
import { PromiseResult, Result } from '@madwire-media/result';
import { RequiresGenerate } from '../../../generate';
import { TmpFiles, TmpFilesSession } from '../..';
import { DefaultTmpFilesSession } from './session';
import { RequiresLogger } from '../../../logger';
import { lt } from '../../../logger/types';

type Dependencies = RequiresFs & RequiresGenerate & RequiresLogger;

export class DefaultTmpFiles
    extends Injectable<Dependencies>
    implements TmpFiles
// eslint-disable-next-line @typescript-eslint/brace-style
{
    private readonly tmpRoot: string;

    constructor(deps: Dependencies, projectRoot: string) {
        super(deps);

        this.tmpRoot = Path.join(projectRoot, '.fm');
    }

    public async init(): PromiseResult<void, Error> {
        const { fs, logger } = this[context];

        (await fs.mkdirp(this.tmpRoot)).try();

        const existingSessions = (await fs.readdir(this.tmpRoot)).try();
        const timeCutoff = Date.now() - 60000;
        let logged = false;

        for (const existingSession of existingSessions) {
            const sessionPath = Path.join(this.tmpRoot, existingSession);
            const lockFilePath = Path.join(sessionPath, 'lock');

            // eslint-disable-next-line no-await-in-loop
            const dirStats = await fs.stat(sessionPath);
            // eslint-disable-next-line no-await-in-loop
            const lockStats = await fs.stat(lockFilePath);

            let shouldDelete = false;

            if (!dirStats.isErr()) {
                if (lockStats.isErr()) {
                    shouldDelete = dirStats.value.getMtime() < timeCutoff;
                } else {
                    shouldDelete = lockStats.value.getMtime() < timeCutoff;
                }
            }

            if (shouldDelete) {
                logger.trace`Cleaning up old session ${lt.path(sessionPath)}`;
                logged = true;

                // TODO: parallelize this?
                // eslint-disable-next-line no-await-in-loop
                (await fs.remove(sessionPath)).try();
            }
        }

        if (logged) {
            logger.trace``;
        }

        return Result.voidOk;
    }

    public async createSession(): PromiseResult<TmpFilesSession, Error> {
        const { fs, generate } = this[context];

        let dirName = generate.uniqueSession();
        let dirPath = Path.join(this.tmpRoot, dirName);

        // eslint-disable-next-line no-await-in-loop
        while (await fs.exists(dirPath)) {
            dirName = generate.uniqueSession();
            dirPath = Path.join(this.tmpRoot, dirName);
        }

        const session = new DefaultTmpFilesSession(this[context], dirPath);

        (await session.init()).try();

        return Result.Ok(session);
    }
}
