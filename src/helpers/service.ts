import * as fs from 'fs';
import * as util from 'util';

import { Branch, BranchEnv, Config, Service } from '../config';

import { ConfiguredDependency } from '../config/types/other';
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
    alreadyRunBranches: Set<string | ConfiguredDependency>,
    isAsync: () => void,
    params: {[arg: string]: any},
) => Promise<undefined | false>;
export type SvcCommandReqHandler = (
    config: Config,
    serviceName: string,
    branchName: string,
    alreadyRunBranches: Set<string | ConfiguredDependency>,
    params: {[arg: string]: any},
    context: any,
) => boolean;
export type SvcCommandMutHandler = (
    config: Config,
    rawConfig: [{}, string, boolean],
    serviceName: string,
    branchName: string,
    alreadyRunBranches: Set<string | ConfiguredDependency>,
    params: {[arg: string]: any},
    context: any,
) => boolean;

export interface ServiceRunOpts {
    liveRun?: boolean;
    config?: Config;
}
export async function runService(
    fn: SvcCommandHandler,
    reqFn: SvcCommandReqHandler,
    mutFn: SvcCommandMutHandler | undefined,
    context: any,
    params: {[arg: string]: any},
    serviceName?: string,
    opts: ServiceRunOpts = {},
) {
    // Clean up any dangling copied files
    await uncopyFiles();

    let {config} = opts;
    let rawConfig: [{}, string, boolean] = [{}, '', false];
    const {liveRun} = opts;

    if (config === undefined) {
        const loadedConfig = loadConfig(context);

        if (loadedConfig === undefined) {
            return false;
        }

        config = loadedConfig.parsed;
        rawConfig = loadedConfig.raw;
    }

    serviceName = serviceName || (config.defaults && config.defaults.service);
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

    if (mutFn !== undefined) {
        const mutResult = mutFn(config, rawConfig, serviceName, branchName, new Set([branchName]), params, context);
        if (!mutResult) {
            return false;
        }
    }

    const reqsMet = reqFn(config, serviceName, branchName, new Set([branchName]), params, context);
    if (!reqsMet) {
        return false;
    }

    let isAsync = false;

    const handlers: SigIntHandler[] = [];
    const result = await fn(
        config,
        serviceName,
        branchName,
        handlers,
        new Set([branchName]),
        () => isAsync = true,
        params,
    );

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
    branch: BranchEnv;
    branchName: string;
    serviceName: string;
    serviceFolder: string;
    usedBranchName: string;
    handlers: SigIntHandler[];
    alreadyRunBranches: Set<string | ConfiguredDependency>;
    config: Config;
    branchType: string;
    params: {[key: string]: any};
    isAsync(): void;
}
export async function initBranch(
    options: InitBranchOptions,
    fn: SvcCommandHandler,
    env: string,
    runAllDeps = true,
): Promise<boolean> {
    const {
        branch, branchName, serviceName, serviceFolder, usedBranchName,
        handlers, config, branchType, isAsync, alreadyRunBranches, params,
    } = options;

    const depResults = await runDependencies(
        config,
        branchName,
        branch,
        handlers,
        alreadyRunBranches,
        isAsync,
        params,
        fn,
        runAllDeps,
    );
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
            await uncopyFiles();
            console.log();

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
        const possibleModes: ('dev' | 'stage' | 'prod')[] = ['dev', 'stage', 'prod'];
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
    branch: BranchEnv,
    handlers: SigIntHandler[],
    alreadyRunBranches: Set<string | ConfiguredDependency>,
    isAsync: () => void,
    params: {[arg: string]: any},
    cb: SvcCommandHandler,
    runAllDeps = true,
): Promise<SigIntHandler[] | false> {
    if (branch.dependsOn !== undefined) {
        for (const rawDependency of branch.dependsOn) {
            let dependency;
            const subParams = {...params};

            delete subParams.env;

            if (typeof rawDependency === 'string') {
                dependency = rawDependency;
            } else {
                dependency = rawDependency.service;
                subParams.env = rawDependency.env;
            }

            if (!runAllDeps && config.services[dependency].type !== 'buildContainer') {
                continue;
            }

            if (alreadyRunBranches.has(rawDependency)) {
                continue;
            }
            alreadyRunBranches.add(rawDependency);

            const newHandlers: SigIntHandler[] = [];
            let depIsAsync = false;
            const newIsAsync = () => {
                depIsAsync = true;
                isAsync();
            };

            const results = await cb(
                config, dependency, branchName, newHandlers, alreadyRunBranches,
                newIsAsync, subParams,
            );

            if (!depIsAsync || results === false) {
                for (const handler of newHandlers) {
                    await handler();
                }

                if (results === false) {
                    // Undo everything
                    for (const handler of handlers) {
                        await handler();
                    }

                    return false;
                }
            } else {
                handlers.push(...newHandlers);
            }
        }
    }

    return handlers;
}

export function reqDependencies(
    config: Config,
    branchName: string,
    branch: BranchEnv,
    alreadyRunBranches: Set<string | ConfiguredDependency>,
    cb: SvcCommandReqHandler,
    params: {[arg: string]: any},
    context: any,
    runAllDeps = true,
): boolean {
    if (branch.dependsOn !== undefined) {
        for (const rawDependency of branch.dependsOn) {
            let dependency;
            const subParams = {...params};

            delete subParams.env;

            if (typeof rawDependency === 'string') {
                dependency = rawDependency;
            } else {
                dependency = rawDependency.service;
                subParams.env = rawDependency.env;
            }

            if (!runAllDeps && config.services[dependency].type !== 'buildContainer') {
                continue;
            }

            if (alreadyRunBranches.has(rawDependency)) {
                continue;
            }
            alreadyRunBranches.add(rawDependency);

            const results = cb(config, dependency, branchName, alreadyRunBranches, subParams, context);

            if (results === false) {
                return false;
            }
        }
    }

    return true;
}

export function getDependencies(
    config: Config,
    mode: 'dev' | 'stage' | 'prod',
    branchName: string,
    serviceName: string,
    types?: string[],
): string[] {
    const dependencies = new Set([serviceName]);
    const toCrawl = new Set([serviceName]);
    const ignored = new Set<string>([]);

    while (toCrawl.size > 0) {
        const serviceName = toCrawl.values().next().value;
        toCrawl.delete(serviceName);

        if (serviceName in config.services) {
            const service = config.services[serviceName];

            // Only add as dependency if right kind of service
            if (types === undefined || types.includes(service.type)) {
                dependencies.add(serviceName);
            } else {
                ignored.add(serviceName);
            }

            const usedBranchName = resolveBranchName(branchName, service.branches);
            const branch = service.branches[usedBranchName][mode];

            if (branch !== undefined && branch.dependsOn !== undefined) {
                for (const rawDep of branch.dependsOn) {
                    let dep;

                    if (typeof rawDep === 'string') {
                        dep = rawDep;
                    } else {
                        dep = rawDep.service;
                    }

                    if (!dependencies.has(dep) && !toCrawl.has(dep) && !ignored.has(dep)) {
                        toCrawl.add(dep);
                    }
                }
            }
        }
    }

    dependencies.delete(serviceName);

    return Array.from(dependencies);
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
