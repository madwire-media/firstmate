import Path from 'path';
import { Injectable, context } from '@madwire-media/di-container';
import { PromiseResult, Result } from '@madwire-media/result';
import { RequiresFs } from '@madwire-media/fs';
import { EngineModuleImpl, EngineHandle, ModuleOutput } from '../..';
import {
    HelmPushStepTypes, helmPushStepKind, HelmPushStep, HelmPushStepProfile,
} from '../../../config/types/steps/helm-push';
import { InterpolatedString } from '../../../config/types/common/interpolated-string';
import { DockerImage, DockerRegistry } from '../../../config/types/common/docker';
import { LocalPath } from '../../../config/types/common/firstmate';
import { Helm } from '../../../commands/helm';

export type Dependencies = RequiresFs;

export class HelmPushStepImpl
    extends Injectable<Dependencies>
    implements EngineModuleImpl<HelmPushStepTypes>
// eslint-disable-next-line @typescript-eslint/brace-style
{
    public readonly kind = helmPushStepKind;

    public readonly moduleType = HelmPushStep;

    public readonly profileType = HelmPushStepProfile;

    public readonly isSource = false;

    public async run(
        _module: HelmPushStep,
        profile: HelmPushStepProfile,
        handle: EngineHandle,
    ): PromiseResult<ModuleOutput, Error> {
        const { fs } = this[context];

        const interpolationContext = handle.getInterpolationContext();
        const version = handle.getContextualVersion();
        const projectRoot = handle.getProjectRoot();
        const cwd = handle.getCwd();

        let chartSource;
        if (profile.source instanceof InterpolatedString) {
            const source = profile.source.interpolate(interpolationContext).try();

            if (DockerImage.is(source)) {
                // Source is a helm chart ref, use helm chart pull and helm chart export
                const tmpDir = (await handle.createTmpDir()).try();

                const chartPullCommand = Helm.chart.pull({
                    chartRef: source,
                });

                const chartPullResult = (await handle.executeCommand(chartPullCommand)).try();

                if (chartPullResult.status !== 0) {
                    return Result.Err(new Error('Helm chart pull failed, see output'));
                }

                const chartExportCommand = Helm.chart.export({
                    chartRef: source,
                    outDir: tmpDir,
                });

                const chartExportResult = (await handle.executeCommand(chartExportCommand)).try();

                if (chartExportResult.status !== 0) {
                    return Result.Err(new Error('Helm chart export failed, see output'));
                }

                const files = (await fs.readdir(tmpDir)).try();

                if (files.length !== 1) {
                    throw new Error(`Unexpected number of files in tmp dir after chart export: ${files.length}`);
                }

                chartSource = Path.join(tmpDir, files[0]);
            } else if (LocalPath.is(source)) {
                // Source is a local path, make sure file got copied over
                const tmpPath = Path.join(cwd, source);

                if (!(await fs.exists(tmpPath))) {
                    (await handle.copyFiles(new Map([
                        [source, source],
                    ]))).try();
                }

                chartSource = tmpPath;
            } else {
                // Source is a project path, reference directly
                chartSource = Path.join(projectRoot, source);
            }
        } else {
            // Source is a helm chart object, use helm fetch
            const tmpDir = (await handle.createTmpDir()).try();

            const name = profile.source.name.interpolate(interpolationContext).try();
            const sourceVersion = profile.source.version.interpolate(interpolationContext).try();

            let repository;
            if (profile.source.repository !== undefined) {
                repository = profile.source.repository.interpolate(interpolationContext).try();
            }

            let chartOrUrl;
            let fetchVersion;
            if (repository !== undefined) {
                chartOrUrl = Path.join(
                    repository,
                    `${name}-${sourceVersion}.tgz`,
                );
            } else {
                chartOrUrl = name;
                fetchVersion = sourceVersion;
            }

            const fetchCommand = Helm.fetch({
                chartOrUrl,
                version: fetchVersion,
                outDir: tmpDir,
            });

            const fetchResult = (await handle.executeCommand(fetchCommand)).try();

            if (fetchResult.status !== 0) {
                return Result.Err(new Error('Helm fetch failed, see output'));
            }

            chartSource = Path.join(tmpDir, `${name}-${sourceVersion}.tgz`);
        }

        if ('chartMuseum' in profile.dest) {
            // Use helm push plugin
            // TODO: implement me
            throw new Error('Uploading via the Helm Push plugin is not currently supported');
        } else {
            // Use helm chart save and push

            const imageName = profile.dest.imageName.interpolate(interpolationContext).try();

            let registry: DockerRegistry | undefined;
            if (profile.dest.registry !== undefined) {
                registry = profile.dest.registry.interpolate(interpolationContext).try();
            }

            let chartRef;
            if (registry !== undefined) {
                chartRef = `${registry}/${imageName}:${version}`;
            } else {
                chartRef = `${imageName}:${version}`;
            }

            const chartSaveCommand = Helm.chart.save({
                chartRef,
                path: chartSource,
            });

            const chartSaveResult = (await handle.executeCommand(chartSaveCommand)).try();

            if (chartSaveResult.status !== 0) {
                return Result.Err(new Error('Helm chart save failed, see output'));
            }

            const chartPushCommand = Helm.chart.push({
                chartRef,
            });

            const chartPushResult = (await handle.executeCommand(chartPushCommand)).try();

            if (chartPushResult.status !== 0) {
                return Result.Err(new Error('Helm chart push failed, see output'));
            }

            return Result.Ok({
                ociRef: chartRef,
            });
        }
    }

    public async destroy(
        _module: HelmPushStep,
        profile: HelmPushStepProfile,
        handle: EngineHandle,
    ): PromiseResult<ModuleOutput, Error> {
        const interpolationContext = handle.getInterpolationContext();
        const version = handle.getContextualVersion();

        if ('chartMuseum' in profile.dest) {
            // Use helm push plugin
            // TODO: implement me
            throw new Error('Uploading via the Helm Push plugin is not currently supported');
        } else {
            // Use helm chart save and push

            const imageName = profile.dest.imageName.interpolate(interpolationContext).try();

            let registry: DockerRegistry | undefined;
            if (profile.dest.registry !== undefined) {
                registry = profile.dest.registry.interpolate(interpolationContext).try();
            }

            let chartRef;
            if (registry !== undefined) {
                chartRef = `${registry}/${imageName}:${version}`;
            } else {
                chartRef = `${imageName}:${version}`;
            }

            return Result.Ok({
                ociRef: chartRef,
            });
        }
    }
}
