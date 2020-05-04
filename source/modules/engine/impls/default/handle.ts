import Path from 'path';
import { Injectable, context } from '@madwire-media/di-container';
import { RequiresFs, defaultWalkOptions } from '@madwire-media/fs';
import { PromiseResult, Result } from '@madwire-media/result';
import { EngineHandle, EngineSession } from '../..';
import { ModulePath, VersionName } from '../../../config/types/common/config-names';
import { ExpressionContext } from '../../../config/types/common/interpolated-string';
import { CommandResult, RequiresCommandRunner, Command } from '../../../commands';
import { CopyFiles } from '../../../config/types/common/config';
import { TmpFilesSession } from '../../../tmp-files';

type Dependencies = RequiresFs & RequiresCommandRunner;

export class DefaultEngineHandle
    extends Injectable<Dependencies>
    implements EngineHandle
// eslint-disable-next-line @typescript-eslint/brace-style
{
    private readonly session: EngineSession;

    private readonly modulePath: ModulePath;

    private readonly moduleDirname: string;

    private readonly interpolationContext: ExpressionContext;

    private readonly contextualVersion: VersionName;

    private readonly tmpFilesSession: TmpFilesSession;

    constructor(
        deps: Dependencies,
        session: EngineSession,
        modulePath: ModulePath,
        moduleDirname: string,
        interpolationContext: ExpressionContext,
        contextualVersion: VersionName,
        tmpFilesSession: TmpFilesSession,
    ) {
        super(deps);

        this.session = session;
        this.modulePath = modulePath;
        this.moduleDirname = moduleDirname;
        this.interpolationContext = interpolationContext;
        this.contextualVersion = contextualVersion;
        this.tmpFilesSession = tmpFilesSession;
    }

    public getProjectRoot(): string {
        return this.session.projectRoot;
    }

    public getCwd(): string {
        return Path.join(this.tmpFilesSession.mainDir, this.modulePath);
    }

    public getInterpolationContext(): ExpressionContext {
        return this.interpolationContext;
    }

    public getContextualVersion(): VersionName {
        return this.contextualVersion;
    }

    public async copyFiles(files: CopyFiles): PromiseResult<void, Error> {
        const { fs } = this[context];

        const cwd = this.getCwd();
        const moduleDirname = Path.join(
            this.session.projectRoot,
            'fm',
            this.moduleDirname,
        );
        const cwdModuleDirname = Path.join(
            this.tmpFilesSession.mainDir,
            this.moduleDirname,
        );

        for (const [dest, source] of files) {
            let sourceDir;
            let destDir;

            if (source.startsWith('./') || source.startsWith('../')) {
                sourceDir = moduleDirname;
            } else {
                sourceDir = this.session.projectRoot;
            }

            if (dest.startsWith('./') || dest.startsWith('../')) {
                destDir = cwdModuleDirname;
            } else {
                destDir = cwd;
            }

            // eslint-disable-next-line no-await-in-loop
            (await fs.copy(
                Path.join(sourceDir, source),
                Path.join(destDir, dest),
                {
                    ...defaultWalkOptions,
                    clobber: true,
                },
            )).try();
        }

        return Result.voidOk;
    }

    public createTmpDir(): PromiseResult<string, Error> {
        return this.tmpFilesSession.createNewArtifactDir();
    }

    public executeCommand(command: Command): PromiseResult<CommandResult, Error> {
        const { commandRunner } = this[context];

        return commandRunner.run(command);
    }

    public executeHiddenCommand(command: Command): PromiseResult<CommandResult, Error> {
        const { commandRunner } = this[context];

        return commandRunner.runHidden(command);
    }
}
