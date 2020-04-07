/* eslint-disable @typescript-eslint/no-use-before-define */
import t from 'io-ts';

import { createModule, createModuleProfile } from '../common/config-helpers';
import { TemplateModuleKind } from '../common/config';

const rootProps = t.type({});

export type TemplateExecution = t.TypeOf<typeof TemplateExecution>;
export const TemplateExecution = createModule(
    'TemplateExecution',
    TemplateModuleKind,
    rootProps,
    t.UnknownRecord,
);

export type TemplateExecutionProfile = t.TypeOf<typeof TemplateExecutionProfile>;
export const TemplateExecutionProfile = createModuleProfile(
    'TemplateExecution',
    t.UnknownRecord,
);
