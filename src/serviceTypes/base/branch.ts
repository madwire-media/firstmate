import { empty } from '../../helpers/empty';

export enum BranchMode {
    dev,
    stage,
    prod,
}

interface CopyFilesRaw {
    [source: string]: any;
}
interface CopyFiles {
    [source: string]: string;
}

export interface Port {
    local: number;
    remote: number;
}
export interface Volumes {
    [source: string]: string;
}

export interface BranchBaseRaw {
    copyFiles?: CopyFilesRaw;
    dependsOn?: string[];
}

export class BranchBase {
    public copyFiles?: CopyFiles;
    public dependsOn?: string[];

    constructor(rawData: BranchBaseRaw) {
        if (rawData.copyFiles !== undefined) {
            const copyFiles = rawData.copyFiles as CopyFiles;

            if (!empty(copyFiles)) {
                this.copyFiles = copyFiles;
            }
        }
        if (rawData.dependsOn !== undefined) {
            const dependsOn = rawData.dependsOn;

            if (!empty(dependsOn)) {
                this.dependsOn = dependsOn;
            }
        }
    }
}

export interface ProdBranch {
    version: string;
}

export interface IBranch<D extends BranchBase, S extends BranchBase, P extends ProdBranch & BranchBase> {
    type: string;
    dev?: D;
    stage?: S;
    prod?: P;
}
