/* eslint-disable @typescript-eslint/no-use-before-define */
import * as t from 'io-ts';

import { createModule, createModuleProfile } from '../common/config-helpers';
import { ModuleTypes, InterpolatedModuleOutputs } from '../common/config';

const rootProps = t.type({});
const profileProps = t.partial({
    outputs: InterpolatedModuleOutputs,
});

export const emptyStepKind = 'step/empty';

export type EmptyStep = t.TypeOf<typeof EmptyStep>;
export const EmptyStep = createModule(
    'EmptyStep',
    t.literal(emptyStepKind),
    rootProps,
    profileProps,
);

export type EmptyStepProfile = t.TypeOf<typeof EmptyStepProfile>;
export const EmptyStepProfile = createModuleProfile(
    'EmptyStep',
    profileProps,
);

export type EmptyStepTypes = ModuleTypes<EmptyStep, EmptyStepProfile, false>;
