import Path from 'path';
import YAML from 'yaml';
import { Injectable, context } from '@madwire-media/di-container';
import { PromiseResult, Result } from '@madwire-media/result';
import { RequiresFs } from '@madwire-media/fs';
import {
    HelmChartSourceTypes, helmChartSourceKind, HelmChartSource, HelmChartSourceProfile,
} from '../../../config/types/sources/helm-chart';
import { EngineModuleImpl, EngineHandle, ModuleOutput } from '../..';
import { Helm } from '../../../commands/helm';
import { CopyFiles } from '../../../config/types/common/config';

export type Dependencies = RequiresFs;

export class HelmChartSourceImpl
    extends Injectable<Dependencies>
    implements EngineModuleImpl<HelmChartSourceTypes>
// eslint-disable-next-line @typescript-eslint/brace-style
{
    public readonly kind = helmChartSourceKind;

    public readonly moduleType = HelmChartSource;

    public readonly profileType = HelmChartSourceProfile;

    public readonly isSource = true;

    public async run(
        _module: HelmChartSource,
        profile: HelmChartSourceProfile,
        handle: EngineHandle,
    ): PromiseResult<ModuleOutput, Error> {
        const { fs } = this[context];

        const interpolationContext = handle.getInterpolationContext();
        const cwd = handle.getCwd();
        const version = handle.getContextualVersion();

        const tmpDir = (await handle.createTmpDir()).try();

        const chartManifestRaw = (await fs.read(Path.join(cwd, 'Chart.yaml'))).try();
        let chartName: string;

        try {
            const chartManifest = YAML.parse(chartManifestRaw);

            if (typeof chartManifest.name === 'string') {
                chartName = chartManifest.name;
            } else {
                return Result.Err(new Error(
                    'No name found in chart manifest',
                ));
            }
        } catch (error) {
            return Result.Err(error);
        }

        const outFile = Path.join(tmpDir, `${chartName}-${version}.tgz`);

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

        if (copyFiles !== undefined) {
            (await handle.copyFiles(copyFiles)).try();
        }

        const packageCommand = Helm.package({
            path: cwd,
            outDir: tmpDir,
            version,
        });

        const packageResult = (await handle.executeCommand(packageCommand)).try();

        if (packageResult.status !== 0) {
            return Result.Err(new Error('Helm package failed, see output'));
        }

        return Result.Ok({
            chart: Path.relative(handle.getProjectRoot(), outFile),
        });
    }

    public async destroy(): PromiseResult<ModuleOutput, Error> {
        return Result.Ok({});
    }
}
