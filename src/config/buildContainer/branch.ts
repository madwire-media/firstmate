import * as t from 'io-ts';

import { setDefault } from '../../util/defaultable';
import { getProps } from '../../util/io-util';
import * as base from '../base/branch';
import { branchType } from '../types/branch';
import { DockerArgs, DockerVolumes } from '../types/docker';
import { ParsingContext } from '../types/parsingContext';
import { Defaults, defaultsFrom } from '../types/serviceDefaults';

export namespace env {
    export namespace atoms {
        // tslint:disable-next-line:no-empty-interface
        export interface AllReq {}
        export interface AllOpt {
            volumes?: DockerVolumes;
            dockerArgs?: DockerArgs;
        }

        // tslint:disable:variable-name
        export const _allReq = t.type({});
        export const _allOpt = t.partial({
            volumes: DockerVolumes,
            dockerArgs: DockerArgs,
        });
        // tslint:enable:variable-name

        export const allReq = t.alias(_allReq)<AllReq, AllReq>();
        export const allOpt = t.alias(_allOpt)<AllOpt, AllOpt>();
    }

    export namespace comp {
        export interface All
        extends
            base.env.comp.All,
            atoms.AllReq,
            atoms.AllOpt {}

        // tslint:disable:variable-name
        export const _all = t.intersection([
            base.env.comp._all,

            atoms.allReq,
            atoms.allOpt,
        ], 'BuildContainerEnv');
        export const _allStrict = t.type(getProps(_all), 'BuildContainerEnvStrict');
        export const _allPartial = t.partial(getProps(_all), 'BuildContainerEnvPartial');
        export const _allExact = t.exact(_all, 'BuildContainerEnvExact');
        // tslint:enable:variable-name

        export const all = t.clean<All>(_all);
        export const allStrict = t.clean<Required<All>>(_allStrict as any);
        export const allPartial = t.clean<Partial<All>>(_allPartial);
        export const allExact = t.exact(_all);
    }

    export namespace defaults {
        type allTypes = t.TypeOf<typeof comp.all>;

        export function all(input: allTypes, context: ParsingContext): allTypes {
            input = base.env.defaults.all(input, context) as any;

            return setDefault(input, {
                volumes: {},
            });
        }
    }
}

export namespace branch {
    export const type = 'buildContainer';

    export const basic = branchType(
        env.comp.all,
        env.comp.all,
        env.comp.all,
        type,
        'BuildContainerBranch',
    );

    export const partial = branchType(
        env.comp.allPartial,
        env.comp.allPartial,
        env.comp.allPartial,
        type,
        'BuildContainerBranchPartial',
    );

    export const exact = branchType(
        env.comp.allExact,
        env.comp.allExact,
        env.comp.allExact,
        type,
        'BuildContainerBranchExact',
    );

    export const strict = branchType(
        env.comp.allStrict,
        env.comp.allStrict,
        env.comp.allStrict,
        type,
        'BuildContainerBranchStrict',
    );

    export const defaults = defaultsFrom(
        strict,
        env.defaults.all,
        env.defaults.all,
        env.defaults.all,
    );
}
