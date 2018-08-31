import * as fs from 'fs';
import * as path from 'path';

import * as doasync from 'doasync';
import * as Hjson from 'hjson';
import { ncp } from 'ncp';

import { a, fmt } from './cli';

interface Mount {
    dest: string;
    replaced: string | false;
}

function generateRandomName(len: number): string {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+=';
    let name = '';

    for (let i = 0; i < len; i++) {
        name += chars[Math.floor(Math.random() * chars.length)];
    }

    return name;
}

const mounts: Set<string> = new Set();
let mountCount = 0;

export async function mount(source: string, dest: string): Promise<boolean> {
    source = path.relative(process.cwd(), path.resolve(source));
    dest = path.relative(process.cwd(), path.resolve(dest));

    if (mounts.has(dest)) {
        console.error(a`\{ly Aready copied to \{m ${dest}\}\}`);
        return true;
    }
    if (!fs.existsSync(source)) {
        console.error(a`\{lr Cannot copy from \{m ${source}\}\}: file does not exist`);
        return false;
    }

    let mountedUnderneath = false;
    for (const mount of mounts) {
        if (!path.relative(mount, dest).includes('..')) {
            mountedUnderneath = true;
        }
    }

    // We don't care if we are copying into a directory that we already modified
    if (!mountedUnderneath) {
        if (fs.existsSync(dest)) {
            // Generate name
            let replaced;
            do {
                replaced = generateRandomName(16);
            } while (!fs.existsSync(`.fm/${replaced}`));

            // Save manifest
            const mount: Mount = {
                dest,
                replaced,
            };
            fs.writeFileSync(`.fm/${mountCount++}.mount`, Hjson.stringify(mount));

            // Move original contents
            fs.renameSync(source, `.fm/${replaced}`);

            // Save mount in session
            mounts.add(dest);
        } else {
            // Save manifest
            const mount: Mount = {
                dest,
                replaced: false,
            };
            fs.writeFileSync(`.fm/${mountCount++}.mount`, Hjson.stringify(mount));

            // Save mount in session
            mounts.add(dest);
        }
    }

    // Copy new contents in
    await doasync(ncp)(source, dest);

    console.log(a`\{ld Copied \{m ${source}\} to \{m ${dest}\}\}`);

    return true;
}

export function unmount(mount: Mount): boolean {
    const {
        dest,
        replaced,
    } = mount;

    fs.unlinkSync(dest);

    if (replaced) {
        fs.renameSync(`.fm/${replaced}`, dest);
    }

    console.log(a`\{ld Reset \{m ${dest}\}\}`);

    return true;
}

export async function copyFiles(
    paths: {[source: string]: string},
    serviceName: string,
): Promise<boolean> {
    const serviceRoot = `fm/${serviceName}`;
    const mountedDirs: {[dest: string]: boolean} = {};

    if (!fs.existsSync('.fm')) {
        fs.mkdirSync('.fm');
    }

    for (const source in paths) {
        const dest = `${serviceRoot}/${paths[source]}`;

        const result = await mount(source, dest);
        if (result === false) {
            uncopyFiles();
            return false;
        }
    }

    return true;
}

export function uncopyFiles(): boolean {
    let returnCode: boolean = true;

    const mountIds = fs.readdirSync('.fm')
        .filter((s) => s.endsWith('.mount'))
        .map((s) => s.substring(0, -6))
        .map((s) => +s)
        .filter((s) => !isNaN(s))
        .sort((a, b) => a - b);

    for (const mountId of mountIds) {
        const mount = Hjson.parse(fs.readFileSync(`.fm/${mountId}.mount`, 'utf8'));

        const result = unmount(mount);
        if (result === false) {
            returnCode = false;
        }
    }

    return returnCode;
}

export function generateMountsScript(
    service: string,
    container: string,
    k8sVolumes: {[source: string]: string},
    command: string,
) {
    if (!fs.existsSync('.fm')) {
        fs.mkdirSync('.fm');
    }

    if (!fs.statSync('.fm').isDirectory()) {
        fs.unlinkSync('.fm');
        fs.mkdirSync('.fm');
    }

    const lines = ['#!/bin/sh'];

    for (const src in k8sVolumes) {
        const dest = k8sVolumes[src];

        lines.push(`ln -s ${fmt(src)} ${fmt(dest)}`);
    }

    lines.push(`exec ${command}`);

    const text = lines.join('\n');
    const filename = `.fm/${service}.${container}.boostrap.sh`;

    fs.writeFileSync(filename, text);

    return filename;
}
