import AggregateError = require('aggregate-error');

import { CopyFiles } from '../config/types/common';
import { KubernetesVolumes } from '../config/types/k8s';

import { FsError, RequiresFs } from '../deps/fs';
import { RequiresHttp } from '../deps/http';
import { RequiresProcess } from '../deps/process';
import { Injectable } from '../util/container/injectable';
import { context } from '../util/container/symbols';
import { fmt } from './cli';
import { RequiresFmMountHelper } from './mount.private';

export interface RequiresFmMount {
    mount: Mount;
}

type Dependencies = RequiresFmMountHelper & RequiresFs & RequiresHttp & RequiresProcess;

interface MountRecord {
    dest: string;
    replaced: string | false;
}

export class Mount extends Injectable<Dependencies> {
    private readonly mounts: Set<string> = new Set();
    private mountCount = 0;

    public async mount(source: string, dest: string): Promise<void> {
        const {fs, mountHelper} = this[context];

        const isHttp = mountHelper.isHttp(source);

        if (!isHttp) {
            source = mountHelper.toRelativePath(source);
            dest = mountHelper.toRelativePath(dest);

            if (!await fs.exists(source)) {
                throw new FsError({
                    code: 'ENOENT',
                    message: 'Cannot copy nonexistent file',
                    path: source,
                });
            }
        }

        const mountedUnderneath = mountHelper.isMountedUnderneath(this.mounts, dest);

        await mountHelper.ensureDotFm();

        let destExists = await fs.exists(dest);

        if (!mountedUnderneath) {
            if (destExists) {
                // Generate name
                const replaced = await mountHelper.generateMountFilename();

                // Save manifest
                await mountHelper.writeMountRecord({
                    dest,
                    replaced,
                }, (this.mountCount++).toString());

                // Move original contents
                await fs.rename(dest, `.fm/${replaced}`);
                destExists = false;

                // Save mount in session
                this.mounts.add(dest);
            } else {
                // Save manifest
                await mountHelper.writeMountRecord({
                    dest,
                    replaced: false,
                }, (this.mountCount++).toString());

                // Save mount in session
                this.mounts.add(dest);
            }
        }

        if (destExists) {
            await fs.remove(dest);
        }

        if (isHttp) {
            await mountHelper.downloadFile(source, dest);
        } else {
            await fs.copy(source, dest);
        }

        // console.log(a`\{ld Copied \{m ${source}\} to \{m ${dest}\}\}`);
    }

    public async unmount(mount: MountRecord): Promise<void> {
        const {fs} = this[context];

        const {dest, replaced} = mount;

        await fs.remove(dest);

        if (replaced) {
            await fs.rename(`.fm/${replaced}`, dest);
        }

        // console.log(a`\{ld Reset \{m ${dest}\}\}`);
    }

    public async copyFiles(paths: CopyFiles, serviceName: string): Promise<void> {
        const {mountHelper} = this[context];

        const serviceRoot = `fm/${serviceName}`;

        await mountHelper.ensureDotFm();

        for (let dest in paths) {
            const source = paths[dest];
            dest = `${serviceRoot}/${dest}`;

            try {
                await this.mount(source, dest);
            } catch (error) {
                await this.uncopyFiles();
                throw error;
            }
        }
    }

    public async uncopyFiles(): Promise<void> {
        const {fs, mountHelper} = this[context];

        if (await mountHelper.hasDotFm()) {
            const mountIds = await mountHelper.getMountIds();

            const errors: Error[] = [];

            for (const mountId of mountIds) {
                try {
                    const mount = await mountHelper.readMountRecord(mountId.toString());
                    await this.unmount(mount);
                } catch (error) {
                    errors.push(error);
                }

                try {
                    await fs.remove(`.fm/${mountId}.mount`);
                } catch (error) {
                    errors.push(error);
                }
            }

            if (errors.length > 0) {
                throw new AggregateError(errors);
            }
        }
    }

    public async generateMountsScript(
        service: string,
        container: string,
        k8sVolumes: KubernetesVolumes,
        command: string,
    ): Promise<string> {
        const {fs, mountHelper} = this[context];

        await mountHelper.ensureDotFm();

        const lines = [
            '#!/bin/sh',
        ];

        for (const dest in k8sVolumes) {
            const src = k8sVolumes[dest];

            lines.push(
                '',
                `# mount ${fmt(src)} to ${fmt(dest)}`,
                `if [ -e ${fmt(dest)} ]; then`,
                `  rm -r ${fmt(dest)}`,
                `fi`,
                `ln -s ${fmt(src)} ${fmt(dest)}`,
            );
        }

        lines.push(
            '',
            `exec ${command}`,
            '',
        );

        const text = lines.join('\n');
        const filename = `.fm/${service}.${container}.bootstrap.sh`;

        if (await fs.exists(filename)) {
            await fs.remove(filename);
        }

        await fs.write(filename, text);
        await fs.chmod(filename, 0o755);

        return filename;
    }
}
