import Path from 'path';
import Hjson from 'hjson';
import { RequiresFs } from '@madwire-media/fs';
import { Injectable, context } from '@madwire-media/di-container';
import { PromiseResult, Result } from '@madwire-media/result';
import { isLeft } from 'fp-ts/lib/Either';
import { ProjectConfig, ModuleConfig } from '../..';
import { RootConfig } from '../../types/root';
import { ModulePath } from '../../types/common/config-names';
import { BaseModule } from '../../types/common/config';
import { ValidationError } from '../../../common/validationError';

type Dependencies = RequiresFs;

export class DefaultProjectConfig
    extends Injectable<Dependencies>
    implements ProjectConfig
// eslint-disable-next-line @typescript-eslint/brace-style
{
    public readonly projectName: string;

    public readonly projectRoot: string;

    constructor(
        deps: Dependencies,
        projectRoot: string,
        rootConfig: RootConfig,
    ) {
        super(deps);

        this.projectRoot = projectRoot;
        this.projectName = rootConfig.project;
    }

    public async loadModule(path: ModulePath): PromiseResult<ModuleConfig, Error> {
        const { fs } = this[context];

        // TODO LATER: support JSON
        const namedPath = `${path}.fm.hjson`;
        const namedAbsolutePath = Path.join(this.projectRoot, 'fm', namedPath);
        const indexPath = Path.join(path, 'index.fm.hjson');
        const indexAbsolutePath = Path.join(this.projectRoot, 'fm', indexPath);

        const namedExists = await fs.exists(namedAbsolutePath);
        const indexExists = await fs.exists(indexAbsolutePath);

        let absoluteFilePath;
        let filePath;

        if (namedExists) {
            if (indexExists) {
                return Result.Err(new Error(
                    `Config files for module '${path}' exist at both [path].fm.hjson and [path]/index.fm.hjson`,
                ));
            }

            absoluteFilePath = namedAbsolutePath;
            filePath = namedPath;
        } else if (indexExists) {
            absoluteFilePath = indexAbsolutePath;
            filePath = indexPath;
        } else {
            return Result.Err(new Error(
                `Config for module '${path}' not found`,
            ));
        }

        const moduleConfigText = (await fs.read(absoluteFilePath)).try();

        let moduleConfigRaw;
        try {
            // TODO LATER: overhaul when serde-js is ready
            moduleConfigRaw = Hjson.parse(moduleConfigText);
        } catch (error) {
            return Result.Err(error);
        }

        const moduleConfigParseResult = BaseModule.decode(moduleConfigRaw);
        if (isLeft(moduleConfigParseResult)) {
            return Result.Err(new ValidationError(
                `Invalid module config at ${filePath}`,
                moduleConfigParseResult.left,
            ));
        }

        return Result.Ok({
            filePath,
            parsed: moduleConfigParseResult.right,
            path,
            raw: moduleConfigRaw,
        });
    }
}
