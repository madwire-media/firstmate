import { RequiresHttp } from '@madwire-media/http';
import { RequiresFs } from '@madwire-media/fs';

import { RequiresCache } from '../../../tmpfs';
import { RequiresEnv } from '../../../env';
import { DefaultMounter } from './impl';
import { MountPrivateImpl } from './private';
import { SingleMounterImpl } from './single';
import { RequiresLogger } from '../../../logger';

type DefaultDependencies = RequiresCache & RequiresEnv & RequiresFs & RequiresHttp & RequiresLogger;

export default function createDefaultMounter(deps: DefaultDependencies): DefaultMounter {
    const {
        cache, env, fs, http, logger,
    } = deps;

    const recordHandle = cache.createHandle('mount.record');
    const contentHandle = cache.createHandle('mount.moved');

    const mountPrivate = new MountPrivateImpl({
        cacheHandle: recordHandle,
        fs,
        http,
    });

    const singleMounter = new SingleMounterImpl({
        cacheHandle: contentHandle,
        env,
        fs,
        mountPrivate,
        logger,
    });

    const defaultMounter = new DefaultMounter({
        mountPrivate,
        singleMounter,
        logger,
    });

    // Setup the defaultMounter to handle remaining mount records
    cache.addHandler(recordHandle, defaultMounter);

    return defaultMounter;
}
