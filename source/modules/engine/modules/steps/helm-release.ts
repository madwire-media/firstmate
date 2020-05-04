import Path from 'path';
import YAML from 'yaml';
import { RequiresFs } from '@madwire-media/fs';
import { Injectable, context } from '@madwire-media/di-container';
import { Result, PromiseResult } from '@madwire-media/result';
import { EngineModuleImpl, EngineHandle, ModuleOutput } from '../..';
import {
    HelmReleaseStepTypes, HelmReleaseStep, HelmReleaseStepProfile, helmReleaseStepKind,
} from '../../../config/types/steps/helm-release';
import { InterpolatedString } from '../../../config/types/common/interpolated-string';
import { DockerImage } from '../../../config/types/common/docker';
import { Helm } from '../../../commands/helm';
import { LocalPath } from '../../../config/types/common/firstmate';
import { computeValues } from '../../../config/helpers/compute-values';

export type Dependencies = RequiresFs;

export class HelmReleaseStepImpl
    extends Injectable<Dependencies>
    implements EngineModuleImpl<HelmReleaseStepTypes>
// eslint-disable-next-line @typescript-eslint/brace-style
{
    public readonly kind = helmReleaseStepKind;

    public readonly moduleType = HelmReleaseStep;

    public readonly profileType = HelmReleaseStepProfile;

    public readonly isSource = false;

    public async run(
        _module: HelmReleaseStep,
        profile: HelmReleaseStepProfile,
        handle: EngineHandle,
    ): PromiseResult<ModuleOutput, Error> {
        const { fs } = this[context];

        const interpolationContext = handle.getInterpolationContext();
        const projectRoot = handle.getProjectRoot();
        const cwd = handle.getCwd();

        const cluster = profile.cluster.interpolate(interpolationContext).try();
        const namespace = profile.cluster.interpolate(interpolationContext).try();
        const release = profile.releaseName.interpolate(interpolationContext).try();

        let chartSource;
        let chartVersion;
        let chartRepository;
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
            chartSource = profile.source.name.interpolate(interpolationContext).try();
            chartVersion = profile.source.version.interpolate(interpolationContext).try();

            if (profile.source.repository !== undefined) {
                chartRepository = profile.source.repository.interpolate(interpolationContext).try();
            }
        }

        let valuesFiles: string[] | undefined;
        if (profile.values) {
            const tmpDir = (await handle.createTmpDir()).try();
            const valuesFile = Path.join(tmpDir, 'values.yaml');

            valuesFiles = [valuesFile];

            const computedValues = computeValues(
                profile.values,
                interpolationContext,
            ).try();

            (await fs.write(valuesFile, YAML.stringify(computedValues))).try();
        }

        const upgradeCommand = Helm.upgrade({
            install: true,
            atomic: true,

            chart: chartSource,
            repository: chartRepository,
            version: chartVersion,

            releaseName: release,
            kubeContext: cluster,
            namespace,

            valuesFiles,
        });

        const upgradeResult = (await handle.executeCommand(upgradeCommand)).try();

        if (upgradeResult.status !== 0) {
            return Result.Err(new Error('Helm upgrade failed, see output'));
        }

        return Result.Ok({});
    }

    public async destroy(
        _module: HelmReleaseStep,
        profile: HelmReleaseStepProfile,
        handle: EngineHandle,
    ): PromiseResult<ModuleOutput, Error> {
        const interpolationContext = handle.getInterpolationContext();

        const cluster = profile.cluster.interpolate(interpolationContext).try();
        const namespace = profile.namespace.interpolate(interpolationContext).try();
        const release = profile.releaseName.interpolate(interpolationContext).try();

        const uninstallCommand = Helm.uninstall({
            releaseName: release,
            kubeContext: cluster,
            namespace,
        });

        const uninstallResult = (await handle.executeCommand(uninstallCommand)).try();

        if (uninstallResult.status !== 0) {
            return Result.Err(new Error('Helm uninstall failed, see output'));
        }

        return Result.Ok({});
    }
}
