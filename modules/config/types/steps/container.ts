/* eslint-disable @typescript-eslint/no-use-before-define */
import t from 'io-ts';

import { createModule } from '../common/config-helpers';
import { ModulePath } from '../common/firstmate';
import { DockerImage } from '../common/docker';

const rootProps = t.union([
    t.type({
        sourceModule: ModulePath,
    }),
    t.type({
        sourceImage: DockerImage,
    }),
]);
const profileProps = t.intersection([
    t.partial({
        // TODO: environment variables
        // TODO: command
        // TODO: volumes
        // TODO: ports

        async: t.boolean,
        proxy: t.boolean,
        overrideEntrypoint: t.boolean,
    }),
    t.type({
    }),
]);

export type ContainerStep = t.TypeOf<typeof ContainerStep>;
export const ContainerStep = createModule(
    'ContainerStep',
    'step/container',
    rootProps,
    profileProps,
);