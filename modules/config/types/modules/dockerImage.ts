/* eslint-disable @typescript-eslint/no-use-before-define */
import t from 'io-ts';

import { createServiceOrModule } from '../common/config';
import { DockerArgs } from '../common/docker';

const rootProps = t.type({
});
const profileProps = t.intersection([
    t.partial({
        dockerArgs: DockerArgs,
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
