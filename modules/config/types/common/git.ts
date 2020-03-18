/* eslint-disable @typescript-eslint/no-use-before-define */
import t from 'io-ts';

const branchNameRegex = /^~?[^/\000-\037\117 ~^:]+$/;

export type BranchName = t.TypeOf<typeof BranchName>;
export const BranchName = t.brand(
    t.string,
    (s): s is t.Branded<string, BranchNameBrand> => branchNameRegex.test(s),
    'BranchName',
);
export interface BranchNameBrand {
    readonly BranchName: unique symbol;
}


const usedBranchNameRegex = /^[^/\000-\037\117 ~^:]+|~default$/;

export type UsedBranchName = t.TypeOf<typeof UsedBranchName>;
export const UsedBranchName = t.brand(
    t.string,
    (s): s is t.Branded<string, UsedBranchNameBrand> => usedBranchNameRegex.test(s),
    'UsedBranchName',
);
export interface UsedBranchNameBrand extends BranchNameBrand {
    readonly UsedBranchName: unique symbol;
}
