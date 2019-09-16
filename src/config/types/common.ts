import * as t from 'io-ts';
import { LocalFilePath } from './strings';

const branchModesObj = {
    dev: true,
    stage: true,
    prod: true,
};
export type BranchMode = t.TypeOf<typeof BranchMode>;
export const BranchMode = t.keyof(branchModesObj, 'BranchMode');
export const branchModes = Object.keys(branchModesObj) as (keyof typeof branchModesObj)[];

const branchActionsObj = {
    run: true,
    publish: true,
    purge: true,
};
export const BranchAction = t.keyof(branchActionsObj, 'BranchAction');
export const branchActions = Object.keys(branchActionsObj) as (keyof typeof branchActionsObj)[];

export type PortNumber = number;
export const PortNumber = t.refinement(
    t.number,
    (n) => n % 1 === 0 && n >= 0 && n <= 65535,
    'PortNumber',
);

export type Port = {
    inner: number,
    outer: number,
} | number;
export const Port = t.union([
    PortNumber,
    t.type({
        inner: PortNumber,
        outer: PortNumber,
    }),
], 'FMPort');

export interface CopyFiles {
    [localDest: string]: LocalFilePath;
}
export const CopyFiles = t.dictionary(LocalFilePath, LocalFilePath);

export interface Env {
    [variable: string]: string;
}
export const Env = t.dictionary(t.string, t.string);

export type AllowedModes = t.TypeOf<typeof AllowedModes>;
export const AllowedModes = t.array(BranchMode);

export type AllowedActions = t.TypeOf<typeof AllowedActions>;
export const AllowedActions = t.array(BranchAction);

export type Primitive = string | number | boolean;
export const Primitive = t.union([t.string, t.number, t.boolean]);
