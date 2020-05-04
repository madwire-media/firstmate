import Path from 'path';
import Hjson from 'hjson';
import { Injectable, context } from '@madwire-media/di-container';
import { RequiresFs } from '@madwire-media/fs';
import { RequiresProcess } from '@madwire-media/process';
import { PromiseResult, Result } from '@madwire-media/result';
import { isLeft } from 'fp-ts/lib/Either';
import { Config, ProjectConfig } from '../..';
import { RootConfig } from '../../types/root';
import { ValidationError } from '../../../common/validationError';
import { DefaultProjectConfig } from './project';

type Dependencies = RequiresFs & RequiresProcess;

// TODO LATER: overhaul when serde-js is ready
const rootFileTypes = {
    'firstmate.hjson': Hjson.parse,
    'firstmate.json': JSON.parse,
};

export class DefaultConfig
    extends Injectable<Dependencies>
    implements Config
// eslint-disable-next-line @typescript-eslint/brace-style
{
    public async locateProject(): PromiseResult<ProjectConfig, Error> {
        const { fs, process } = this[context];

        let dir = process.cwd();
        let rootConfigPath;
        let rootConfigParser;

        while (dir !== '/' && dir !== '.') {
            for (const [filename, parser] of Object.entries(rootFileTypes)) {
                const configPath = Path.join(dir, filename);

                // eslint-disable-next-line no-await-in-loop
                if (await fs.exists(configPath)) {
                    rootConfigPath = configPath;
                    rootConfigParser = parser;
                    break;
                }
            }

            if (rootConfigPath !== undefined) {
                break;
            }

            dir = Path.dirname(dir);
        }

        // Second conditional only exists for TypeScript's sake
        if (rootConfigPath === undefined || rootConfigParser === undefined) {
            return Result.Err(new Error('No project found in current working directory (or parent directories)'));
        }

        const rootConfigText = (await fs.read(rootConfigPath)).try();

        let rootConfigRaw;
        try {
            rootConfigRaw = rootConfigParser(rootConfigText);
        } catch (error) {
            return Result.Err(error);
        }

        const rootConfigParseResult = RootConfig.decode(rootConfigRaw);
        if (isLeft(rootConfigParseResult)) {
            return Result.Err(new ValidationError(
                `Invalid root config at ${rootConfigPath}`,
                rootConfigParseResult.left,
            ));
        }

        return Result.Ok(new DefaultProjectConfig(
            this[context],
            dir,
            rootConfigParseResult.right,
        ));
    }
}
