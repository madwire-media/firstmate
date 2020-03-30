/* eslint-disable @typescript-eslint/no-use-before-define */
import t from 'io-ts';

import { createModule } from '../common/config-helpers';
import { ModulePath } from '../common/firstmate';
import { DockerRegistry, DockerImageName } from '../common/docker';
import { interpolated } from '../common/interpolated-string';

const rootProps = t.type({
    sourceModule: ModulePath,
});
const profileProps = t.intersection([
    t.partial({
        registry: interpolated(DockerRegistry),
    }),
    t.type({
        imageName: interpolated(DockerImageName),
    }),
]);

export type DockerPushStep = t.TypeOf<typeof DockerPushStep>;
export const DockerPushStep = createModule(
    'DockerPushStep',
    'step/docker-push',
    rootProps,
    profileProps,
);
