import { PromiseResult, Result } from '@madwire-media/result';
import { NativeFs } from '@madwire-media/fs-node';
import { ExtraFs } from '@madwire-media/fs-extra';
import { NodeProcess } from '@madwire-media/process-node';
import { concurrently } from '@madwire-media/concurrently/impl';
import { Api } from '..';
import { ModulePath, ProfileName } from '../../config/types/common/config-names';
import { DefaultConfig } from '../../config/impls/default/impl';
import { DefaultModuleEngine } from '../../engine/impls/default/engine';
import { DefaultCommandRunner } from '../../commands/impls/default';
import { ColoredConsoleLogger } from '../../logger/impls/colored-console';
import { DefaultGit } from '../../git/impls/default';
import { DefaultGenerate } from '../../generate/impls/default';
import { ProjectConfig } from '../../config';
import { DefaultTmpFiles } from '../../tmp-files/impls/default/impl';
import { ModuleEngine } from '../../engine';
import { TmpFiles } from '../../tmp-files';
import { MainServiceImpl } from '../../engine/modules/services/main';
import { ChildServiceImpl } from '../../engine/modules/services/child';
import { DockerImageSourceImpl } from '../../engine/modules/sources/docker-image';
import { HelmChartSourceImpl } from '../../engine/modules/sources/helm-chart';
import { ContainerStepImpl } from '../../engine/modules/steps/container';
import { DockerPushStepImpl } from '../../engine/modules/steps/docker-push';
import { EmptyStepImpl } from '../../engine/modules/steps/empty';
import { HelmPushStepImpl } from '../../engine/modules/steps/helm-push';
import { HelmReleaseStepImpl } from '../../engine/modules/steps/helm-release';

interface Dependencies {
    projectConfig: ProjectConfig;
    engine: ModuleEngine;
    tmpFiles: TmpFiles;
}

const allModuleImpls = [
    MainServiceImpl,
    ChildServiceImpl,

    DockerImageSourceImpl,
    HelmChartSourceImpl,

    ContainerStepImpl,
    // DeferredContainerStepImpl
    DockerPushStepImpl,
    EmptyStepImpl,
    HelmPushStepImpl,
    HelmReleaseStepImpl,
];

export class CliApi implements Api {
    private readonly projectConfig: ProjectConfig;

    private readonly engine: ModuleEngine;

    private readonly tmpFiles: TmpFiles;

    constructor(deps: Dependencies) {
        this.projectConfig = deps.projectConfig;
        this.engine = deps.engine;
        this.tmpFiles = deps.tmpFiles;
    }

    public async run(
        service: ModulePath,
        profile: ProfileName,
    ): PromiseResult<void, Error> {
        const loader = this.projectConfig.loadModule.bind(this.projectConfig);

        const preloaded = (await this.engine.preloadConfig(
            service,
            profile,
            loader,
        )).try();

        const tmpFilesSession = (await this.tmpFiles.createSession()).try();

        (await this.engine.executeConfig(
            preloaded,
            this.projectConfig.projectRoot,
            { type: 'run' },
            tmpFilesSession,
        )).try();

        (await tmpFilesSession.cleanup()).try();

        return Result.voidOk;
    }

    public async destroy(
    // service: ModulePath,
    // profile: ProfileName,
    ): PromiseResult<void, Error> {
        throw new Error('unimplemented');
    }
}

export async function createDefaultCli(): PromiseResult<CliApi, Error> {
    const fsBasic = new NativeFs();
    const process = new NodeProcess();

    const fs = new ExtraFs({
        fsBasic,
        concurrently,
    });

    const logger = new ColoredConsoleLogger();
    const generate = new DefaultGenerate();

    const commandRunner = new DefaultCommandRunner({
        logger,
    });

    const git = new DefaultGit({
        process,
    });

    const config = new DefaultConfig({
        fs,
        process,
    });

    const engine = new DefaultModuleEngine({
        commandRunner,
        fs,
        generate,
        git,
        logger,
    });

    for (const impl of allModuleImpls) {
        // eslint-disable-next-line new-cap
        engine.registerModuleImpl(new impl({ fs }));
    }

    const projectConfig = (await config.locateProject()).try();

    const tmpFiles = new DefaultTmpFiles({
        fs,
        generate,
        logger,
    }, projectConfig.projectRoot);

    (await tmpFiles.init()).try();

    return Result.Ok(new CliApi({
        engine,
        projectConfig,
        tmpFiles,
    }));
}
