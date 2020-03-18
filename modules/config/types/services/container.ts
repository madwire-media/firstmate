/* eslint-disable @typescript-eslint/no-use-before-define */
import t from 'io-ts';

import { createServiceOrModule } from '../common/config';
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

        overrideEntrypoint: t.boolean,
    }),
    t.type({
    }),
]);

export type DockerImageService = t.TypeOf<typeof DockerImageService>;
export const DockerImageService = createServiceOrModule(
    'DockerImageService',
    'service/docker-image',
    rootProps,
    profileProps,
);
