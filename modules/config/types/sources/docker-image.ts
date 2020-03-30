/* eslint-disable @typescript-eslint/no-use-before-define */
import t from 'io-ts';

import { createModule } from '../common/config-helpers';
import { DockerArgs } from '../common/docker';

const rootProps = t.type({
});
const profileProps = t.intersection([
    t.partial({
        buildArgs: DockerArgs,
        alwaysPull: t.boolean,
    }),
    t.type({
    }),
]);

export type DockerImageSource = t.TypeOf<typeof DockerImageSource>;
export const DockerImageSource = createModule(
    'DockerImageSource',
    'source/docker-image',
    rootProps,
    profileProps,
);
