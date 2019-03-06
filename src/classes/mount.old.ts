import * as fs from 'fs-extra';
import * as path from 'path';
import { promisify } from 'util';

import * as Hjson from 'hjson';
import * as request from 'request';

import { a, fmt } from './cli';
import { defer } from './promise';

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
    let isHttp = false;

    if (/https?:\/\//.test(source)) {
        isHttp = true;
    } else {
        source = path.relative(process.cwd(), path.resolve(source));
        dest = path.relative(process.cwd(), path.resolve(dest));

        if (!fs.existsSync(source)) {
            console.error(a`\{lr Cannot copy from \{m ${source}\}\}: file does not exist`);
            return false;
        }
    }

    let mountedUnderneath = false;
    let relative: string;
    for (const mount of mounts) {
        relative = path.relative(path.dirname(dest), mount);

        if (relative === '.' || /(^|\/)\.\.\//.test(relative)) {
            mountedUnderneath = true;
            break;
        }
    }

    ensureDotFm();

    // We don't care if we are copying into a directory that we already modified
    if (!mountedUnderneath) {
        if (fs.existsSync(dest)) {
            // Generate name
            let replaced;
            do {
                replaced = generateRandomName(16);
            } while (fs.existsSync(`.fm/${replaced}`));

            // Save manifest
            const mount: Mount = {
                dest,
                replaced,
            };
            fs.writeFileSync(`.fm/${mountCount++}.mount`, Hjson.stringify(mount));

            // Move original contents
            fs.renameSync(dest, `.fm/${replaced}`);

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

    if (fs.pathExistsSync(dest)) {
        fs.removeSync(dest);
    }

    if (isHttp) {
        const {promise, resolve, reject} = defer();

        request(source)
            .pipe(fs.createWriteStream(dest))
            .on('close', resolve)
            .on('error', reject);

        await promise;
    } else {
        // Copy new contents in
        await fs.copy(source, dest);
    }

    console.log(a`\{ld Copied \{m ${source}\} to \{m ${dest}\}\}`);

    return true;
}

export async function unmount(mount: Mount): Promise<boolean> {
    const {
        dest,
        replaced,
    } = mount;

    fs.removeSync(dest);

    if (replaced) {
        fs.renameSync(`.fm/${replaced}`, dest);
    }

    console.log(a`\{ld Reset \{m ${dest}\}\}`);

    return true;
}

export async function copyFiles(
    paths: {[dest: string]: string},
    serviceName: string,
): Promise<boolean> {
    const serviceRoot = `fm/${serviceName}`;
    const mountedDirs: {[dest: string]: boolean} = {};

    ensureDotFm();

    for (let dest in paths) {
        const source = paths[dest];
        dest = `${serviceRoot}/${dest}`;

        try {
            const result = await mount(source, dest);
            if (result === false) {
                await uncopyFiles();
                return false;
            }
        } catch (error) {
            console.error(error);
            return false;
        }
    }

    return true;
}

export async function uncopyFiles(): Promise<boolean> {
    let returnCode: boolean = true;

    if (await hasDotFm()) {
        const mountIds = fs.readdirSync('.fm')
            .filter((s) => s.endsWith('.mount'))
            .map((s) => s.slice(0, -6))
            .map((s) => +s)
            .filter((s) => !isNaN(s))
            .sort((a, b) => a - b);

        for (const mountId of mountIds) {
            try {
                const mount = Hjson.parse(fs.readFileSync(`.fm/${mountId}.mount`, 'utf8'));

                const result = await unmount(mount);
                if (result === false) {
                    returnCode = false;
                }

                fs.unlinkSync(`.fm/${mountId}.mount`);
            } catch (error) {
                console.error(error);
            }
        }
    }

    return returnCode;
}

export function generateMountsScript(
    service: string,
    container: string,
    k8sVolumes: {[dest: string]: string},
    command: string,
) {
    ensureDotFm();

    const lines = ['#!/bin/sh'];

    for (const dest in k8sVolumes) {
        const src = k8sVolumes[dest];

        lines.push(
            `if [ -e ${fmt(dest)} ]; then`,
            `  rm -r ${fmt(dest)}`,
            `fi`,
            `ln -s ${fmt(src)} ${fmt(dest)}`,
        );
    }

    lines.push(`exec ${command}`);

    const text = lines.join('\n');
    const filename = `.fm/${service}.${container}.bootstrap.sh`;

    if (fs.existsSync(filename)) {
        fs.unlinkSync(filename);
    }

    fs.writeFileSync(filename, text, {mode: 0o777});

    return filename;
}

async function hasDotFm() {
    return await fs.stat('.fm')
        .then(
            (stats) => stats.isDirectory(),
            () => false,
        );
}

function ensureDotFm() {
    try {
        const stats = fs.statSync('.fm');

        if (!stats.isDirectory()) {
            fs.removeSync('.fm');
            fs.mkdirSync('.fm');
        }
    } catch (e) {
        fs.mkdirSync('.fm');
    }
}
