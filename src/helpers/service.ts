import * as fs from 'fs';
import * as util from 'util';

import { Branch, Config, Service } from '../config';
import { BranchBase } from '../serviceTypes/base/branch';

import { a, colors, events } from './cli';
import { loadConfig } from './config';
import { empty } from './empty';
import { getGitBranch, getGitBranches } from './git';
import { copyFiles, uncopyFiles } from './mount';
import { hasFolder, needsFile, needsFolder } from './require';

export type SigIntHandler = () => Promise<undefined | false>;
export type SvcCommandHandler = (
    config: Config,
    serviceName: string,
    branchName: string,
    handlers: SigIntHandler[],
    isAsync: () => void,
    params: string[],
) => Promise<undefined | false>;
export type SvcCommandReqHandler = (
    config: Config,
    serviceName: string,
    branchName: string,
    params: string[],
    context: any,
) => boolean;

export interface ServiceRunOpts {
    liveRun?: boolean;
    config?: Config;
}
export async function runService(
    fn: SvcCommandHandler,
    reqFn: SvcCommandReqHandler,
    context: any,
    serviceName?: string,
    opts: ServiceRunOpts = {},
    params: any[] = [],
) {
    // Clean up any dangling copied files
    await uncopyFiles();

    let {config} = opts;
    const {liveRun} = opts;

    config = config || loadConfig(context);
    if (config === undefined) {
        return false;
    }

    serviceName = serviceName || config.defaultService;
    if (serviceName === undefined) {
        if (context) {
            context.cliMessage('No default service in config');
        } else {
            console.error(a`\{lr No default service in config\}`);
        }
        return false;
    }

    if (!(serviceName in config.services)) {
        if (context) {
            context.cliMessage(a`\{lr,t Service \{nt,lw ${serviceName}\} not configured in \{nt,m firstmate.json\}\}`);
        } else {
            console.error(a`\{lr Service \{lw ${serviceName}\} not configured in \{m firstmate.json\}\}`);
        }
        return false;
    }

    if (liveRun && !testServiceDir(context, serviceName)) {
        return false;
    }

    const branchName = getGitBranch(context);
    if (branchName === false) {
        return false;
    }

    if (liveRun) {
        console.log(a`Detected git branch \{lg ${branchName}\}`);
        console.log();
    }

    const reqsMet = reqFn(config, serviceName, branchName, params, context);
    if (!reqsMet) {
        return false;
    }

    let isAsync = false;

    const handlers: SigIntHandler[] = [];
    const result = await fn(config, serviceName, branchName, handlers, () => isAsync = true, params);

    if (result === false) {
        for (const handler of handlers.reverse()) {
            await handler();
        }

        return false;
    }
    if (handlers.length > 0 && isAsync) {
        console.log('Running... (press Ctrl+C to exit)');
        return await new Promise<boolean>((resolve) => {
            events.once('interrupt', async () => {
                console.log('Exiting...');

                let result = true;

                for (const handler of handlers.reverse()) {
                    if (await handler() === false) {
                        result = false;
                    }
                }

                resolve(result);
            });

            // Keep Node.js open while waiting for interrupt
            const interval = setInterval(() => 0, 1000);
            events.once('interrupt', () => clearInterval(interval));
        });
    } else if (handlers.length > 0) {
        let result = true;

        for (const handler of handlers.reverse()) {
            if (await handler() === false) {
                result = false;
            }
        }

        return result;
    }

    return true;
}

export interface InitBranchOptions {
    branch: BranchBase;
    branchName: string;
    serviceName: string;
    serviceFolder: string;
    usedBranchName: string;
    handlers: SigIntHandler[];
    config: Config;
    branchType: string;
    isAsync(): void;
}
export async function initBranch(options: InitBranchOptions, fn: SvcCommandHandler, env: string): Promise<boolean> {
    const {
        branch, branchName, serviceName, serviceFolder, usedBranchName, handlers, config, branchType, isAsync,
    } = options;

    const depResults = await runDependencies(config, branchName, branch, handlers, isAsync, fn);
    if (depResults === false) {
        return false;
    } else {
        handlers.push(...depResults);
    }

    console.log(a`Running service \{lw ${serviceName}\} on branch \{lg ${usedBranchName}\} in ${env} mode`);
    console.log(a`\{y Type\}: \{g ${branchType}\}`);
    console.log(a`\{y Params\}:`);
    for (const key in branch) {
        const value = (branch as {[key: string]: any})[key];

        if (value !== undefined && !empty(value)) {
            console.log(a`  \{y ${key}\}: ${util.inspect(value, {colors})}`);
        }
    }

    // Should be handled in reqs functions
    // if (!testServiceFiles(serviceName, branchType)) {
    //     return false;
    // }

    if (branch.copyFiles !== undefined) {
        console.log();

        const result = await copyFiles(branch.copyFiles, serviceName);
        if (result === false) {
            return false;
        }

        handlers.push(async () => {
            console.log();
            await uncopyFiles();

            return undefined;
        });
    }

    return true;
}

export function maybeTryBranch(
    service: Service,
    usedBranchName: string,
    mode: 'dev' | 'stage' | 'prod',
): boolean {
    if (!service.branches[usedBranchName][mode]) {
        const defaultGood = mode in service.branches['~default'];
        const branches = getGitBranches();
        const possibleModes: Array<'dev' | 'stage' | 'prod'> = ['dev', 'stage', 'prod'];
        const modes = possibleModes.filter((m) => !!service.branches[usedBranchName][m]);
        let foundOption = false;

        if (branches === false) {
            return false;
        }

        branches.local = branches.local.filter(
            (b) => b in service.branches ? !!service.branches[b][mode] : defaultGood,
        );
        branches.remote = branches.remote.filter(
            (b) => b in service.branches ? !!service.branches[b][mode] : defaultGood,
        );

        console.log();
        console.log(a`\{b Did you mean to:\}`);

        for (const m of modes) {
            console.log(a`  Run in \{c ${m}\} mode?`);
            foundOption = true;
        }
        if (branches.local.length > 0) {
            console.log(a`  Switch to a local branch? \{lw (${
                branches.local.slice(0, 10).join(', ')
            }${
                branches.local.length > 10 ? ', ...' : ''
            })\}`);
            foundOption = true;
        }
        if (branches.remote.length > 0) {
            console.log(a`  Pull down a remote branch? \{lw (${
                branches.remote.slice(0, 10).join(', ')
            }${
                branches.remote.length > 10 ? ', ...' : ''
            }) \}`);
            foundOption = true;
        }
        if (defaultGood) {
            console.log(a`  Create a new branch?`);
            foundOption = true;
        }

        console.log(a`  Allow \{c ${mode}\} mode on branch \{g ${usedBranchName}\}?`);

        // for (const branchName in service.branches) {
        //     if (mode in service.branches[branchName]) {
        //         if (branchName === '~default') {
        //             defaultGood = true;
        //         } else if (branchName[0] !== '~') {
        //             goodBranches.push(branchName);
        //         }
        //     }
        // }

        return false;
    }

    return true;
}

export function resolveBranchName(branchName: string, branches: {[branchName: string]: Branch}): string {
    if (!(branchName in branches)) {
        return '~default';
    } else {
        return branchName;
    }
}

export async function runDependencies(
    config: Config,
    branchName: string,
    branch: BranchBase,
    handlers: SigIntHandler[],
    isAsync: () => void,
    cb: SvcCommandHandler,
): Promise<SigIntHandler[] | false> {
    if (branch.dependsOn !== undefined) {
        for (const dependency of branch.dependsOn) {
            const results = await cb(config, dependency, branchName, handlers, isAsync, []);

            if (results === false) {
                // Undo everything
                for (const handler of handlers) {
                    handler();
                }

                return false;
            }
        }
    }

    return handlers;
}

export function reqDependencies(
    config: Config,
    branchName: string,
    branch: BranchBase,
    cb: SvcCommandReqHandler,
    context: any,
): boolean {
    if (branch.dependsOn !== undefined) {
        for (const dependency of branch.dependsOn) {
            const results = cb(config, dependency, branchName, [], context);

            if (results === false) {
                return false;
            }
        }
    }

    return true;
}

export function getServiceDir(serviceName: string): string {
    return `fm/${serviceName}`;
}

export function testServiceDir(context: any, serviceName: string): boolean {
    const serviceFolder = getServiceDir(serviceName);

    if (!fs.existsSync(serviceFolder)) {
        if (context) {
            context.cliMessage(a`\{lr,t No Firstmate source folder found at \{m ${serviceFolder
                }\}: \{nt folder does not exist\}\}`);
        } else {
            console.error(a`\{lr No Firstmate source folder found at \{m fm/${serviceName}\}\}: folder does not exist`);
        }
        return false;
    }

    if (!fs.statSync(serviceFolder).isDirectory()) {
        if (context) {
            context.cliMessage(a`\{lr,t No Firstmate source folder found at \{m ${serviceFolder
                }\}: \{nt found other file instead\}`);
        } else {
            console.error(a`\{lr No Firstmate source folder found at \{m fm/${serviceName
                }\}\}: found other file instead`);
        }
        return false;
    }

    return true;
}

export function testServiceFiles(serviceName: string, kind: string): boolean {
    const serviceFolder = getServiceDir(serviceName);
    let result = true;

    switch (kind) {
        case 'Docker Image':
            result = result &&
                needsFile(`${serviceFolder}/Dockerfile`);
            break;

        case 'Docker Deployment':
            result = result &&
                needsFile(`${serviceFolder}/Chart.yaml`) &&
                needsFile(`${serviceFolder}/values.yaml`) &&
                needsFolder(`${serviceFolder}/templates`);

            if (hasFolder(`${serviceFolder}/docker`)) {
                const imageDirs = fs.readdirSync(`${serviceFolder}/docker`);

                for (let imageDir of imageDirs) {
                    if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]+$/.test(imageDir)) {
                        result = false;
                        console.error(a`\{lr '${imageDir}' is not a valid container name\} ${''
                            }(at \{m ${serviceFolder}/${imageDir}\}`);
                    }

                    imageDir = `${serviceFolder}/docker/${imageDir}`;

                    if (hasFolder(imageDir)) {
                        result = result && needsFile(`${imageDir}/Dockerfile`);
                    }
                }
            }
            break;

        case 'Pure Helm':
            if (needsFolder(`${serviceFolder}/helm`)) {
                result = result &&
                    needsFile(`${serviceFolder}/helm/Chart.yaml`) &&
                    needsFile(`${serviceFolder}/helm/values.yaml`) &&
                    needsFolder(`${serviceFolder}/helm/templates`);
            } else {
                result = false;
            }
            break;

        case 'Build Container':
            result = result && needsFile(`${serviceFolder}/Dockerfile`);
            break;
    }

    return result;
}
