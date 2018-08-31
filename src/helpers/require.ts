import * as ChildProcess from 'child_process';
import * as fs from 'fs';

import { a, which } from './cli';
import * as kubectl from './commands/kubectl';

export const commands: {
    [simpleName: string]: string,
} = {};

export function needsNamespace(cluster: string, namespace: string): boolean {
    if (!kubectl.hasNamespace(cluster, namespace)) {
        return kubectl.createNamespace(cluster, namespace);
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
