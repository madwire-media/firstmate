import { empty } from '../../helpers/empty';
import { BranchBase, BranchBaseRaw, Volumes } from '../base/branch';

export interface BuildContainerBranchRaw extends BranchBaseRaw {
    volumes?: Volumes;
    dockerArgs?: {[key: string]: string};
}

export class BuildContainerBranchAll extends BranchBase {
    public volumes: Volumes = {};
    public dockerArgs: {[key: string]: string} = {};

    constructor(rawData: BuildContainerBranchRaw) {
        super(rawData);

        if (rawData.volumes !== undefined) {
            this.volumes = rawData.volumes;
        }
        if (rawData.dockerArgs !== undefined) {
            this.dockerArgs = rawData.dockerArgs;
        }
    }
}
