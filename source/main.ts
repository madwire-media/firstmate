/* eslint-disable no-console */

import 'source-map-support/register';
import type {} from '@madwire-media/result-try';

import { program } from 'commander';
import * as t from 'io-ts';
import { isLeft } from 'fp-ts/lib/Either';
import { PromiseResult, Result } from '@madwire-media/result';
import { printRum } from './modules/silly/rum';
import { formatArgs } from './modules/commands/helpers/escape';
import { ModulePath, ProfileName } from './modules/config/types/common/config-names';
import type { CliApi } from './modules/api/impls/cli';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function as<T extends t.Type<any, any>>(type: T, input: string): t.TypeOf<T> {
    const result = type.decode(input);

    if (isLeft(result)) {
        throw new Error(`Not a valid ${type.name}: '${input}'`);
    } else {
        return result.right;
    }
}

let cachedApi: CliApi | undefined;
const getApi = async (): PromiseResult<CliApi, Error> => {
    if (!cachedApi) {
        const { createDefaultCli } = await import('./modules/api/impls/cli');

        cachedApi = (await createDefaultCli()).try();
    }

    return Result.Ok(cachedApi);
};

program.version('0.2.0-alpha');

program
    .command('rum [params...]', { hidden: true })
    .description('Acquire a tasty beverage')
    .action((params: string[]) => {
        printRum();

        if (params.length > 0) {
            console.log();
            console.log(`Did you mean to run 'fm run ${formatArgs(params)}'?`);
        }
    });

program
    .command('run <service> <profile>')
    .usage('[options] <service> :<profile>')
    .description('Run a service and all its dependencies')
    .action(async (rawService: string, rawProfile: string) => {
        if (!rawProfile.startsWith(':')) {
            throw new Error("Profile does not start with a ':'");
        }

        const service = as(ModulePath, rawService);
        const profile = as(ProfileName, rawProfile.slice(1));

        const api = (await getApi()).unwrapRaw();

        (await api.run(service, profile)).unwrapRaw();
    });

program
    .command('destroy <service> <profile>')
    .usage('[options] <service> :<profile>')
    .description('Destroy all running artifacts from a service')
    .action(async (rawService: string, rawProfile: string) => {
        if (!rawProfile.startsWith(':')) {
            throw new Error("Profile does not start with a ':'");
        }

        const service = as(ModulePath, rawService);
        const profile = as(ProfileName, rawProfile.slice(1));

        const api = (await getApi()).unwrapRaw();

        (await api.destroy(service, profile)).unwrapRaw();
    });

program.parseAsync(process.argv)
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
