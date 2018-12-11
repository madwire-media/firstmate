import * as t from 'io-ts';

import { branchType } from '../types/branch';

import { setDefault } from '../../util/defaultable';
import { getProps } from '../../util/io-util';
import { CopyFiles } from '../types/common';
import { ParsingContext } from '../types/parsingContext';
import { BranchName, ServiceName } from '../types/strings';

export namespace env {
    export namespace atoms {
        export interface AllReq {
            version: string;
        }
        export interface AllOpt {
            copyFiles?: CopyFiles;
            dependsOn?: ServiceName[];
        }
        export interface InheritFrom {
            inheritFrom?: BranchName | BranchName[];
        }

        // tslint:disable:variable-name
        export const _allReq = t.type({
            version: t.string,
        });
        export const _allOpt = t.partial({
            copyFiles: CopyFiles,
            dependsOn: t.array(ServiceName),
        });
        export const _inheritFrom = t.partial({
            inheritFrom: t.union([
                t.array(BranchName),
                BranchName,
            ]),
        });
        // tslint:enable:variable-name

        export const allReq = t.alias(_allReq)<AllReq, AllReq>();
        export const allOpt = t.alias(_allOpt)<AllOpt, AllOpt>();
        export const inheritFrom = t.alias(_inheritFrom)<InheritFrom, InheritFrom>();
    }

    export namespace comp {
        export interface All
        extends
            atoms.AllOpt,
            atoms.AllReq {}

        // tslint:disable:variable-name
        export const _all = t.intersection([
            atoms.allReq,
            atoms.allOpt,
        ]);
        export const _allStrict = t.type(getProps(_all));
        export const _allPartial = t.partial(getProps(_all));
        // tslint:enable:variable-name

        export const all = t.clean<All>(_all);
        export const allStrict = t.clean<Required<All>>(_allStrict as any);
        export const allPartial = t.clean<Partial<All>>(_allPartial);
    }

    export namespace defaults {
        type allTypes = t.TypeOf<typeof comp.all>;
        type allTypesStrict = t.TypeOf<typeof comp.allStrict>;

        export function all(input: allTypes, context: ParsingContext): allTypesStrict {
            return setDefault(input, {
                copyFiles: {},
                dependsOn: [],
            }) as any;
        }
    }
}

export namespace branch {
    export const basic = branchType(
        env.comp.all,
        env.comp.all,
        env.comp.all,
        '' as any,
        'BranchBase',
    );

    export const partial = branchType(
        env.comp.allPartial,
        env.comp.allPartial,
        env.comp.allPartial,
        '' as any,
        'BranchBasePartial',
    );

    // No exact branch
}
