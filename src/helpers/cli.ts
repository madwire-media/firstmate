import * as ChildProcess from 'child_process';
import * as EventEmitter from 'events';
import * as fs from 'fs';
import * as os from 'os';
import * as readline from 'readline';
import * as tty from 'tty';
import * as util from 'util';

import * as Hjson from 'hjson';
import * as mkdirp from 'mkdirp';
import * as GitConfig from 'parse-git-config';

import { Branch, Config, ConfigBase, Service } from '../config';
import { BranchBase } from '../serviceTypes/base/branch';
import { parseUserConfig, User } from '../user';
import { createNamespace, hasNamespace } from './commands';
import { empty } from './empty';

export type SigIntHandler = () => Promise<undefined | false>;
export type SvcCommandHandler = (
    config: Config,
    serviceName: string,
    branchName: string,
    handlers: SigIntHandler[],
    isAsync: () => void,
    params: string[],
) => undefined | false;
export type SvcCommandReqHandler = (
    config: Config,
    serviceName: string,
    branchName: string,
    params: string[],
    context: any,
) => boolean;

const which = os.platform() === 'win32' ? 'where' : 'which';
let a: {
    [cmd: string]: string,
} & ((strings?: TemplateStringsArray, ...keys: any[]) => string);
const colors = tty.isatty(0);

// Use colors if a tty, otherwise use a shim instead
if (colors) {
    // tslint:disable-next-line:no-var-requires
    a = require('short-ansi')();
} else {
    a = new Proxy((strings?: TemplateStringsArray, ...keys: any[]): string => {
        let output = '';

        if (strings !== undefined) {
            const strs = strings.raw;

            for (let str of strs) {
                str = str.replace(/\\{[a-z0-9_,]* ?|\\}/g, '');

                output += unescape(str);

                if (keys !== undefined && keys.length > 0) {
                    output += keys.shift();
                }
            }
        }

        return output;
    }, {
        get: () => '',
        set: () => true,
    }) as {
        [cmd: string]: string,
    } & ((strings?: TemplateStringsArray, ...keys: string[]) => string);
}

const commands: {
    [simpleName: string]: string,
} = {};

export {a, colors, commands};

export function fmt(arg: string): string {
    if (/[ '"`(){}$*#\\]/.test(arg)) {
        return JSON.stringify(arg);
    } else {
        return arg;
    }
}

const events = new EventEmitter();
let interruptTriggered = false;
export function interrupt() {
    console.log('Interrupt!');

    if (interruptTriggered) {
        return;
    }
    interruptTriggered = true;

    events.emit('interrupt');
}
process.on('SIGINT', interrupt);
export function onInterrupt(watcher: () => void) {
    if (interruptTriggered) {
        watcher();
    } else {
        events.once('interrupt', watcher);
    }
}

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
    const result = fn(config, serviceName, branchName, handlers, () => isAsync = true, params);

    if (result === false) {
        for (const handler of handlers.reverse()) {
            await handler();
        }

        return false;
    }
    if (handlers.length > 0 && isAsync) {
        console.log('Running... (press Ctrl+C to exit)');
        return await new Promise<boolean>((resolve) => {
            events.on('interrupt', async () => {
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
            events.on('interrupt', () => clearInterval(interval));
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

// export function runServiceBase(fn: SvcCommandHandler, liveRun: boolean, context: any) {
//     return async function(serviceName: string, config?: Config): Promise<boolean> {
//         let reqMet = true;
//         const isOk = true;
//         let params = [];

//         if (liveRun) {
//             reqMet = reqMet &&
//                 needsSudo(context) &&
//                 needsCommand(context, 'docker') &&
//                 needsCommand(context, 'helm') &&
//                 needsCommand(context, 'telepresence');

//             if (!reqMet) {
//                 return false;
//             }
//         }

//         if (config === undefined || !(config instanceof Config)) {
//             params = Array.from(arguments).slice(1, -1);

//             config = loadConfig(context);
//         }
//         if (config === undefined) {
//             return false;
//         }

//         if (!(serviceName in config.services)) {
//             console.error(a`\{lr Service '${serviceName}' not configured in \{m firstmate.json\}\}`);
//             return false;
//         }

//         if (liveRun) {
//             const serviceFolder = testServiceDir(serviceName);
//             if (serviceFolder === undefined) {
//                 // Missing code hinders further testing
//                 return false;
//             }
//         }

//         const branchName = getGitBranch();
//         if (branchName === false) {
//             return false;
//         }

//         if (liveRun) {
//             console.log(a`Detected git branch \{lg ${branchName}\}`);
//             console.log();
//         }

//         let isAsync = false;

//         const handlers: SigIntHandler[] = [];
//         const result = fn(config, serviceName, branchName, handlers, () => isAsync = true, params);

//         if (result === false) {
//             for (const handler of handlers.reverse()) {
//                 await handler();
//             }

//             return false;
//         }
//         if (handlers.length > 0 && isAsync) {
//             console.log('Running... (press Ctrl+C to exit)');
//             return await new Promise<boolean>((resolve) => {
//                 onInterrupt(async () => {
//                     console.log('Exiting...');

//                     let returnCode = true;

//                     for (const handler of handlers.reverse()) {
//                         if (await handler() === false) {
//                             returnCode = false;
//                         }
//                     }

//                     resolve(returnCode);
//                 });
//             });
//         } else if (handlers.length > 0) {
//             let returnCode = true;

//             for (const handler of handlers.reverse()) {
//                 if (await handler() === false) {
//                     returnCode = false;
//                 }
//             }

//             return returnCode;
//         }

//         return isOk;
//     };
// }

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
export function initBranch(options: InitBranchOptions, fn: SvcCommandHandler, env: string): boolean {
    const {
        branch, branchName, serviceName, serviceFolder, usedBranchName, handlers, config, branchType, isAsync,
    } = options;

    const depResults = runDependencies(config, branchName, branch, handlers, isAsync, fn);
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

        const result = copyFiles(branch.copyFiles, serviceName);
        if (result === false) {
            return false;
        }

        handlers.push(async () => {
            console.log();
            return uncopyFiles(result);
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

export function needsNamespace(cluster: string, namespace: string): boolean {
    if (!hasNamespace(cluster, namespace)) {
        return createNamespace(cluster, namespace);
    }

    return true;
}

export function needsSudo(context: any): boolean {
    if (process.getuid() !== 0) {
        context.cliMessage('This command needs to be run as root');
        return false;
    }

    return true;
}

export function needsCommand(context: any, command: string): boolean {
    const result = ChildProcess.spawnSync(which, [command]);

    if (result.error) {
        console.error(result.error);
        return false;
    }
    if (result.status !== 0) {
        if (context) {
            context.cliMessage(a`\{lr,t Could not find \{nt,lw ${command}\} in PATH, is it installed?\}`);
        } else {
            console.error(a`\{lr Could not find \{lw ${command}\} in PATH, is it installed?\}`);
        }
        return false;
    }

    if (result.output[1].length > 0) {
        commands[command] = result.output[1].toString().split('\n')[0].trim();
    } else {
        if (context) {
            context.cliMessage(a`\{lr,t Could not find \{nt,lw ${command}\} in 'which' result, is it installed?\}`);
        } else {
            console.error(a`\{lr Could not find \{lw ${command}\} 'which' result, is it installed?\}`);
        }
        return false;
    }

    return true;
}

export function needsCluster(context: any, cluster: string): boolean {
    const result = ChildProcess.spawnSync('kubectl', ['config', 'get-contexts', '-o', 'name']);

    if (result.error) {
        console.error(result.error);
        return false;
    }
    if (result.status !== 0) {
        if (context) {
            context.cliMessage(a`\{lr,t Could not read cluster list, is \{nt,lw kubectl\} installed?`);
        } else {
            console.error(a`\{lr Could not read cluster list, is \{lw kubectl\} installed?`);
        }
        return false;
    }

    const clusters = result.stdout.toString().split('\n').filter((s) => !!s);

    if (!clusters.includes(cluster)) {
        if (context) {
            context.cliMessage(a`\{lr,t Could not find cluster \{nt,lw ${cluster
                }\}, did you make a kubectl context for it?`);
        } else {
            console.error(a`\{lr Could not find cluster \{lw ${cluster
                }\}, did you make a kubectl context for it?`);
        }
        return false;
    }

    return true;
}

export function needsFile(filename: string): boolean {
    let result = fs.existsSync(filename);

    if (!result) {
        console.error(a`\{lr Expected file at \{m ${filename}\}\}: file not found`);
    } else if (!fs.statSync(filename).isFile()) {
        result = false;
        console.error(a`\{lr Expected file at \{m ${filename}\}\}: found folder instead`);
    }

    return result;
}

export function needsFolder(foldername: string): boolean {
    let result = fs.existsSync(foldername);

    if (!result) {
        console.error(a`\{lr Expected folder at \{m ${foldername}/\}\}: folder not found`);
    } else if (!fs.statSync(foldername).isDirectory()) {
        result = false;
        console.error(a`\{lr Expected folder at \{m ${foldername}/\}\}: found file instead`);
    }

    return result;
}

export function hasFolder(foldername: string): boolean {
    let result = fs.existsSync(foldername);

    if (result && !fs.statSync(foldername).isDirectory()) {
        result = false;
        console.error(a`\{lr Expected file \{m ${foldername}\} to be a file\}`);
    }

    return result;
}

export function getGitBranch(context: any): string | false {
    let branchName;

    if (!fs.existsSync('.git')) {
        if (context) {
            context.cliMessage('Not a git repository');
        } else {
            console.error(a`\{lr Not a git repository\}`);
        }
        return false;
    }

    if (!fs.existsSync('.git/HEAD')) {
        branchName = '~default';
    } else {
        branchName = fs.readFileSync('.git/HEAD', 'utf8');
        branchName = branchName.substr(branchName.lastIndexOf('/') + 1).trim();
    }

    return branchName;
}

export interface GitBranches {
    remote: string[];
    local: string[];
}
export function getGitBranches(context?: any): GitBranches | false {
    if (!fs.existsSync('.git')) {
        if (context) {
            context.cliMessage('Not a git repository');
        } else {
            console.error(a`\{lr Not a git repository\}`);
        }
        return false;
    }

    const branches: GitBranches = {
        remote: [],
        local: [],
    };

    if (fs.existsSync('.git/refs/remotes/origin')) {
        branches.remote = fs.readdirSync('.git/refs/remotes/origin')
            .filter((s) => s !== 'HEAD');
    }

    branches.local = fs.readdirSync('.git/refs/heads');

    return branches;
}

export function getGitOrigin(context: any): string | false {
    if (!fs.existsSync('.git')) {
        if (context) {
            context.cliMessage('Not a git repository');
        } else {
            console.error(a`\{lr Not a git repository\}`);
        }
        return false;
    }

    if (fs.existsSync('.git/config')) {
        const config = GitConfig.sync();

        if (config['remote "origin"'] !== undefined) {
            if (config['remote "origin"'].url !== undefined) {
                return config['remote "origin"'].url;
            }
        }
    }

    // No origin found
    if (context) {
        context.cliMessage('Git repository does not have remote "origin"');
    } else {
        console.error(a`\{lr Git repository does not have remote "origin"\}`);
    }

    return false;
}

export function loadConfigRaw(context: any): [ConfigBase, string, boolean] | undefined {
    let filename;
    let isHjson;
    const filename1 = `firstmate.hjson`;
    const filename2 = `firstmate.json`;

    const file1Exists = fs.existsSync(filename1);
    const file2Exists = fs.existsSync(filename2);

    if (!file1Exists && !file2Exists) {
        if (context) {
            context.cliMessage(a`\{e,lr,t Could not find \{nt,m ${filename1}\} file\}`);
        } else {
            console.error(a`\{lr Could not find \{m ${filename1}\} file\}`);
        }
        return;
    }

    if (file1Exists) {
        filename = filename1;
        isHjson = true;
    } else {
        filename = filename2;
        isHjson = false;
    }

    let file;
    try {
        file = fs.readFileSync(filename, 'utf8');
    } catch (error) {
        if (context) {
            context.cliMessage(a`\{lr,t Could not read \{nt,m ${filename}\} file: \{nt ${error.message}\}\}`);
        } else {
            console.error(a`\{lr Could not read \{m ${filename}\} file\}: ${error.message}`);
        }
        return;
    }

    let data;
    try {
        if (isHjson) {
            data = Hjson.rt.parse(file);
        } else {
            data = JSON.parse(file);
        }
    } catch (error) {
        if (context) {
            context.cliMessage(a`\{lr,t Could not parse \{nt,m ${filename}\} file: \{nt ${error.message}\}\}`);
        } else {
            console.error(a`\{lr Could not parse \{m ${filename}\} file\}: ${error.message}`);
        }
        return;
    }

    return [data, filename, isHjson];
}

export function loadConfig(context: any): Config | undefined {
    const raw = loadConfigRaw(context);

    if (raw === undefined) {
        return;
    }
    const [data, filename] = raw;

    let parseResult;
    try {
        parseResult = Config.parseRaw(data);
    } catch (error) {
        if (context) {
            context.cliMessage(a`\{lr,t Could not parse \{nt,m ${filename}\} file: \{nt ${error.message}\}\}`);
        } else {
            console.error(a`\{lr Could not parse \{m ${filename}\} file\}: ${error.message}`);
        }
        return;
    }

    if (!(parseResult instanceof Config)) {
        if (context) {
            context.cliMessage(a`\{lr,t Could not parse \{nt,m ${filename}\} file: \{nt Invalid schema\}`);
        } else {
            console.error(a`\{lr Could not parse \{m ${filename}\} file\}: Invalid schema`);
        }

        for (const error of parseResult) {
            if (context) {
                context.cliMessage(a`${a.e}  at \{c ${error.dataPath
                    }\}: \{lr ${error.message}\} (${error.schemaPath})`);
            } else {
                console.error(a`  at \{c ${error.dataPath}\}: \{lr ${error.message}\} (${error.schemaPath})`);
            }
        }

        return;
    }

    return parseResult;
}

export async function loadUser(): Promise<User | undefined> {
    const dir = `${process.env.HOME}/.local/firstmate`;
    const file = `${dir}/user.json`;

    if (!fs.existsSync(dir)) {
        mkdirp.sync(dir);
    }

    if (!fs.existsSync(file)) {
        const user = await newUser();

        if (user === undefined) {
            return undefined;
        }

        fs.writeFileSync(file, JSON.stringify(user, null, 2));

        return user;
    } else {
        return parseUserConfig(JSON.parse(fs.readFileSync(file, 'utf8')));
    }
}

export async function newUser(firstTime = true, oldData?: User): Promise<User | undefined> {
    if (firstTime) {
        console.log(a`\{lw It looks like this is your first time using FirstMate,${''
            } please fill out the fields below to begin\}`);
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const name = await new Promise((resolve: (s: string) => void) => {
        rl.question('Name (author field): ', resolve);

        if (oldData !== undefined && oldData.name !== undefined) {
            rl.write(oldData.name);
        }
    });

    if (name === '') {
        console.error(a`\{lr Not a valid name '\{w ${name}\}'\}`);

        rl.close();
        return undefined;
    }

    rl.close();
    return {
        name,
    };
}

export function getServiceDir(serviceName: string): string {
    return `fm/${serviceName}`;
}

export function testServiceDir(context: any, serviceName: string): boolean {
    const serviceFolder = getServiceDir(serviceName);

    if (!fs.existsSync(serviceFolder)) {
        if (context) {
            context.cliMessage(a`\{lr,t No firstmate source folder found at \{m ${serviceFolder
                }\}: \{nt folder does not exist\}\}`);
        } else {
            console.error(a`\{lr No firstmate source folder found at \{m fm/${serviceName}\}\}: folder does not exist`);
        }
        return false;
    }

    if (!fs.statSync(serviceFolder).isDirectory()) {
        if (context) {
            context.cliMessage(a`\{lr,t No firstmate source folder found at \{m ${serviceFolder
                }\}: \{nt found other file instead\}`);
        } else {
            console.error(a`\{lr No firstmate source folder found at \{m fm/${serviceName
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
            if (needsFolder(`${serviceFolder}/helm`)) {
                result = result &&
                    needsFile(`${serviceFolder}/helm/Chart.yaml`) &&
                    needsFile(`${serviceFolder}/helm/values.yaml`) &&
                    needsFolder(`${serviceFolder}/helm/templates`);
            } else {
                result = false;
            }

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

export function resolveBranchName(branchName: string, branches: {[branchName: string]: Branch}): string {
    if (!(branchName in branches)) {
        return '~default';
    } else {
        return branchName;
    }
}

export function runDependencies(
    config: Config,
    branchName: string,
    branch: BranchBase,
    handlers: SigIntHandler[],
    isAsync: () => void,
    cb: SvcCommandHandler,
): SigIntHandler[] | false {
    if (branch.dependsOn !== undefined) {
        for (const dependency of branch.dependsOn) {
            const results = cb(config, dependency, branchName, handlers, isAsync, []);

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

// TODO: Make mount work on windows (probably by copying and moving)
export function mount(source: string, dest: string): undefined | string | false {
    let returnCode: undefined | string;

    if (!fs.existsSync(source)) {
        console.error(a`\{lr Cannot copy from \{m ${source}\}\}: file does not exist`);
        return false;
    }

    // Only create the destination if it doesn't exist already
    if (!fs.existsSync(dest)) {
        // Create point to mount to
        const stat = fs.statSync(source);
        if (stat.isDirectory()) {
            fs.mkdirSync(dest);
        } else {
            fs.writeFileSync(dest, '');
        }

        returnCode = dest;
    }

    // Mount the stuff
    const result = ChildProcess.spawnSync('bindfs', ['-n', source, dest]);

    if (result.error) {
        console.error(a`\{lr Bind mount failed for \{m ${source}\} to \{m ${dest}\}\}`);
        console.error(result.error);
        return false;
    }
    if (result.status !== 0) {
        console.error(a`\{lr Bind mount failed for \{m ${source}\} to \{m ${dest}\}\}`);
        return false;
    }

    console.log(a`\{ld Copied \{m ${source}\} to \{m ${dest}\}\}`);

    return returnCode;
}

// TODO: Make unmount work on windows (probably by copying and moving)
export function unmount(dest: string, deleteFile: boolean): undefined | false {
    // Unmount the stuff
    let result;
    if (os.platform() === 'darwin') {
        result = ChildProcess.spawnSync('umount', ['-f', dest]);
    } else {
        result = ChildProcess.spawnSync('fusermount', ['-u', dest]);
    }

    if (result.error) {
        console.log(a`\{lr Failed to unmount \{m ${dest}\}\}`);
        console.log(result.error);
        return false;
    }
    if (result.status !== 0) {
        console.log(a`\{lr Failed to unmount \{m ${dest}\}\}`);
        return false;
    }

    if (deleteFile) {
        // Delete the point we mounted to
        const stat = fs.statSync(dest);
        if (stat.isDirectory()) {
            fs.rmdirSync(dest);
        } else {
            fs.unlinkSync(dest);
        }
    }

    console.log(a`\{ld Reset \{m ${dest}\}\}`);
}

export function copyFiles(paths: {[source: string]: string}, serviceName: string): {[dest: string]: boolean} | false {
    const serviceRoot = `fm/${serviceName}`;
    const mountedDirs: {[dest: string]: boolean} = {};

    for (const source in paths) {
        const dest = `${serviceRoot}/${paths[source]}`;

        const result = mount(source, dest);
        if (result === false) {
            for (const dest in mountedDirs) {
                unmount(dest, mountedDirs[dest]);
            }
            return false;
        }
        mountedDirs[dest] = !!result;
    }

    return mountedDirs;
}

export function uncopyFiles(mountedDirs: {[dest: string]: boolean}): undefined | false {
    let returnCode: undefined | false;

    for (const dir in mountedDirs) {
        const result = unmount(dir, mountedDirs[dir]);

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
