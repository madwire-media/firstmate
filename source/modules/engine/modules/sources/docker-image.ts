import Path from 'path';
import { PromiseResult, Result } from '@madwire-media/result';
import { Injectable, context } from '@madwire-media/di-container';
import { RequiresFs } from '@madwire-media/fs';
import {
    EngineModuleImpl, EngineHandle, ModuleOutput,
} from '../..';
import {
    DockerImageSource, DockerImageSourceProfile, DockerImageSourceTypes, dockerImageSourceKind,
} from '../../../config/types/sources/docker-image';
import { Docker } from '../../../commands/docker';
import { DockerArgs } from '../../../config/types/common/docker';
import { CopyFiles } from '../../../config/types/common/config';

export type Dependencies = RequiresFs;

export class DockerImageSourceImpl
    extends Injectable<Dependencies>
    implements EngineModuleImpl<DockerImageSourceTypes>
// eslint-disable-next-line @typescript-eslint/brace-style
{
    public readonly kind = dockerImageSourceKind;

    public readonly moduleType = DockerImageSource;

    public readonly profileType = DockerImageSourceProfile;

    public readonly isSource = true;

    public async run(
        _module: DockerImageSource,
        profile: DockerImageSourceProfile,
        handle: EngineHandle,
    ): PromiseResult<ModuleOutput, Error> {
        const { fs } = this[context];

        const interpolationContext = handle.getInterpolationContext();
        const cwd = handle.getCwd();

        const tmpDir = (await handle.createTmpDir()).try();
        const imageIdFile = Path.join(tmpDir, 'image-id');

        let copyFiles: CopyFiles | undefined;
        if (profile.copyFiles !== undefined) {
            copyFiles = new Map();

            for (const [key, value] of profile.copyFiles) {
                copyFiles.set(
                    key.interpolate(interpolationContext).try(),
                    value.interpolate(interpolationContext).try(),
                );
            }
        }

        let buildArgs: DockerArgs | undefined;
        if (profile.buildArgs !== undefined) {
            buildArgs = new Map();

            for (const [key, value] of profile.buildArgs) {
                buildArgs.set(key, value.interpolate(interpolationContext).try());
            }
        }

        let tags: string[] | undefined;
        if (profile.localImageName !== undefined) {
            if (profile.shouldVersionLocalImage) {
                tags = [`${profile.localImageName}:${handle.getContextualVersion()}`];
            } else {
                tags = [profile.localImageName];
            }
        }

        if (copyFiles !== undefined) {
            (await handle.copyFiles(copyFiles)).try();
        }

        const buildCommand = Docker.build({
            context: cwd,
            alwaysPull: profile.alwaysPull,
            buildArgs,
            imageIdFile,
            tags,
        });

        const buildResult = (await handle.executeCommand(buildCommand)).try();

        if (buildResult.status !== 0) {
            return Result.Err(new Error('Docker build failed, see output'));
        }

        const imageId = (await fs.read(imageIdFile)).try();

        return Result.Ok({
            image: imageId,
        });
    }

    public destroyParams(): Result<ModuleOutput, Error> {
        return Result.Ok({
            image: '[generated]',
        });
    }
}
