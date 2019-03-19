import { CopyFiles } from '../../config/types/common';
import { KubernetesVolumes } from '../../config/types/k8s';

export interface RequiresFmMount {
    mount: Mount;
}

export interface MountRecord {
    dest: string;
    replaced: string | false;
}

export interface Mount {
    mount(source: string, dest: string): Promise<void>;
    unmount(mount: MountRecord): Promise<void>;
    copyFiles(paths: CopyFiles, serviceName: string): Promise<void>;
    uncopyFiles(): Promise<void>;
    generateMountsScript(
        service: string,
        container: string,
        k8sVolumes: KubernetesVolumes,
        command: string,
    ): Promise<string>;
}
