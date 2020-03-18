/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-unused-vars */
import Path from 'path';

import { Injectable, context } from '@madwire-media/di-container';
import { PromiseResult, Result } from '@madwire-media/result';
import AggregateError from 'aggregate-error';

import { AggregateMounter, MountRequest } from '../..';
import { RequiresMountPrivate } from './private';
import { RequiresSingleMounter } from './single';
import { MountRecord } from './types';
import { RequiresLogger } from '../../../logger';

type Dependencies = RequiresMountPrivate & RequiresSingleMounter & RequiresLogger;

export class DefaultMounter extends Injectable<Dependencies> implements AggregateMounter {
    public readonly autoCleanTmpFiles = false;

    public async doMount(files: MountRequest, serviceName: string): PromiseResult<void, Error> {
        const { singleMounter } = this[context];

        const records: MountRecord[] = [];
        const errors: Error[] = [];

        for (const [dest, source] of Object.entries(files)) {
            const translatedDest = Path.join(serviceName, dest);

            const mountResult = await singleMounter.mountFile(source, translatedDest);

            if (mountResult.isErr()) {
                errors.push(mountResult.error);

                records.reverse();

                for (const record of records) {
                    const unmountResult = await singleMounter.unmountFile(record);

                    // Stryker is complaining about this, but it's not something
                    // I want to test, it's just for debugging purposes
                    if (unmountResult.isErr()) {
                        errors.push(unmountResult.error);
                    }
                }

                return Result.Err(new AggregateError(errors));
            }

            if (mountResult.value !== undefined) {
                records.push(mountResult.value);
            }
        }

        return Result.voidOk;
    }

    public async clearMounts(): PromiseResult<void, Error> {
        const { mountPrivate } = this[context];

        const files = (await mountPrivate.getMountRecords()).try();

        return this.cleanup(files);
    }

    public async cleanup(files: string[]): PromiseResult<void, Error> {
        const { singleMounter, mountPrivate, logger } = this[context];

        if (files.length > 0) {
            logger.warn`Found preexisting mounts, some changes may be lost`;
        }

        const errors: Error[] = [];

        for (const recordName of files) {
            const recordResult = await mountPrivate.readMountRecord(recordName);

            if (recordResult.isErr()) {
                errors.push(recordResult.error);
            } else {
                const unmountResult = await singleMounter.unmountFile(recordResult.value);

                if (unmountResult.isErr()) {
                    errors.push(unmountResult.error);
                }
            }
        }

        if (errors.length > 0) {
            return Result.Err(new AggregateError(errors));
        }

        return Result.voidOk;
    }
}
