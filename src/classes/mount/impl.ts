import AggregateError from 'aggregate-error';

import { CopyFiles } from '../../config/types/common';
import { KubernetesVolumes } from '../../config/types/k8s';

import { Mount, MountRecord } from '.';
import { FsError, RequiresFs } from '../../deps/fs';
import { RequiresHttp } from '../../deps/http';
import { RequiresProcess } from '../../deps/process';
import { context, ContextOf, defaults, Injectable } from '../../util/container';
import { fmt } from '../cli';
import { MountPrivate, RequiresFmMountHelper } from './private';

type Dependencies = RequiresFmMountHelper & RequiresFs & RequiresHttp & RequiresProcess;

export class MountImpl extends Injectable<Dependencies> implements Mount {
    public static [defaults](context:  ContextOf<MountPrivate>): RequiresFmMountHelper {
        return {
            mountPrivate: new MountPrivate(context),
        };
    }

    private readonly mounts: Set<string> = new Set();
    private mountCount = 0;

    public async mount(source: string, dest: string): Promise<void> {
        const {fs, mountPrivate} = this[context];

        const isHttp = mountPrivate.isHttp(source);

        if (!isHttp) {
            source = mountPrivate.toRelativePath(source);
            dest = mountPrivate.toRelativePath(dest);

            if (!await fs.exists(source)) {
                throw new FsError({
                    code: 'ENOENT',
                    message: 'Cannot copy nonexistent file',
                    path: source,
                });
            }
        }

        const mountedUnderneath = mountPrivate.isMountedUnderneath(this.mounts, dest);

        await mountPrivate.ensureDotFm();

        let destExists = await fs.exists(dest);

        if (!destExists) {
            await fs.mkdirp(dest);
        }

        if (!mountedUnderneath) {
            if (destExists) {
                // Generate name
                const replaced = await mountPrivate.generateMountFilename();

                // Save manifest
                await mountPrivate.writeMountRecord({
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
                await mountPrivate.writeMountRecord({
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
            await mountPrivate.downloadFile(source, dest);
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
        const {mountPrivate} = this[context];

        const serviceRoot = `fm/${serviceName}`;

        await mountPrivate.ensureDotFm();

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
        const {fs, mountPrivate} = this[context];

        if (await mountPrivate.hasDotFm()) {
            const mountIds = await mountPrivate.getMountIds();

            const errors: Error[] = [];

            for (const mountId of mountIds) {
                try {
                    const mount = await mountPrivate.readMountRecord(mountId.toString());
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
        const {fs, mountPrivate} = this[context];

        await mountPrivate.ensureDotFm();

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
