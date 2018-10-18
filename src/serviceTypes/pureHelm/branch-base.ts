import { empty } from '../../helpers/empty';
import { BranchBase, BranchBaseRaw } from '../base/branch';

export interface PureHelmBranchRaw extends BranchBaseRaw {
    cluster: string;
    namespace: string;
    releaseName?: string;
    helmArgs?: {[argName: string]: string};
    chartmuseum?: string;
}

export class PureHelmBranchBase extends BranchBase {
    public cluster: string;
    public namespace: string;
    public releaseName?: string;
    public helmArgs: {[argName: string]: string} = {};
    public chartmuseum?: string;

    constructor(rawData: PureHelmBranchRaw) {
        super(rawData);

        this.cluster = rawData.cluster;
        this.namespace = rawData.namespace;
        this.releaseName = rawData.releaseName;
        this.chartmuseum = rawData.chartmuseum;

        if (rawData.helmArgs !== undefined && !empty(rawData.helmArgs)) {
            this.helmArgs = rawData.helmArgs;
        }
    }
}
