import * as t from 'io-ts';
import { LocalFilePath } from './strings';

export enum BranchModeEnum {
    dev,
    stage,
    prod,
}
export const BranchMode = t.keyof(BranchModeEnum, 'BranchMode');
export const branchModes = Object.keys(BranchModeEnum).filter((k) => isNaN(+k)) as (keyof typeof BranchModeEnum)[];

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

export type AllowedModes = BranchModeEnum[];
export const AllowedModes = t.array(BranchMode);

export type Primitive = string | number | boolean;
export const Primitive = t.union([t.string, t.number, t.boolean]);
