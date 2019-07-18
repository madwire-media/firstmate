import * as ChildProcess from 'child_process';
import * as fs from 'fs';

import { HelmArgs } from '../../config/types/helm';
import { a, fmt } from '../cli';

export function hasRelease(cluster: string, release: string): boolean {
    const result = ChildProcess.spawnSync(
        'helm', ['status', '--kube-context', cluster, release],
    );

    if (result.error) {
        console.error(a`\{lr Helm status failed!\}`);
        console.error(result.error);
        return false;
    }
    if (result.status !== 0) {
        return false;
    }

    return true;
}

export interface HelmContext {
    branch: {
        namespace: string,
        cluster: string,
        registry?: string,
        helmArgs?: HelmArgs,
        recreatePods?: boolean,
        version?: string,
    };
    env: string;
    dockerImages?: {[container: string]: string};
    telepresenceContainer?: string;
    dryrun?: boolean;
}
export function install(context: HelmContext, release: string, service: string, repo = 'fm'): boolean {
    let valuesFile;

    if (context.branch.helmArgs !== undefined) {
        valuesFile = setupHelmValues(context.branch.helmArgs);
    }

    const args = parseHelmInstallArgs(context, valuesFile);
    let argsText = args.map(fmt).join(' ');

    let chart;
    let chartText;

    if (/https?:\/\//.test(repo)) {
        chart = ['--repo', repo, service];
        chartText = `--repo ${fmt(repo)} ${fmt(service)}`;
    } else {
        chart = [`${repo}/${service}`];
        chartText = fmt(`${repo}/${service}`);
    }

    let action;
    let actionText;

    if (hasRelease(context.branch.cluster, release)) {
        action = ['upgrade', release].concat(chart);
        actionText = `upgrade ${fmt(release)} ${chartText}`;

        if (context.branch.recreatePods && !context.telepresenceContainer) {
            args.push('--recreate-pods');
            argsText += ' --recreate-pods';
        }
    } else {
        action = ['install', '-n', release].concat(chart);
        actionText = `install -n ${fmt(release)} ${chartText}`;
    }

    console.log();
    console.log(a`\{lb,u helm ${actionText} ${argsText}\}`);
    const result = ChildProcess.spawnSync(
        'helm', action.concat(args),
        {
            stdio: 'inherit',
        },
    );

    if (result.error) {
        console.error(a`\{lr Helm install failed!\}`);
        console.error(result.error);
        return false;
    }
    if (result.status !== 0) {
        console.error(a`\{lr Helm install failed!\}`);
        return false;
    }

    if (valuesFile !== undefined) {
        cleanupHelmValues(valuesFile);
    }

    console.log(a`\{g Ok\}`);

    return true;
}

export function parseHelmInstallArgs(context: HelmContext, valuesFile?: string): string[] {
    const args: string[] = [];

    if (context.dryrun) {
        args.push('--dry-run');
    }

    if (context.branch.version !== undefined) {
        args.push('--version', context.branch.version);
    }

    if (context.dockerImages !== undefined && context.branch.registry !== undefined) {
        for (const container in context.dockerImages) {
            const image = context.dockerImages[container];

            if (context.telepresenceContainer === container) {
                args.push('--set', `images.${container}=${image}`);
                args.push('--set', `debugContainer=${container}`);
            } else {
                args.push('--set', `images.${container}=${context.branch.registry}/${image}`);
            }
        }
    }

    if (valuesFile !== undefined) {
        args.push('-f', valuesFile);
    }

    args.push('--set', `env=${context.env}`);

    args.push('--kube-context', context.branch.cluster);
    args.push('--namespace', context.branch.namespace);

    return args;
}

function generateRandomName(len: number): string {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+=';
    let name = '';

    for (let i = 0; i < len; i++) {
        name += chars[Math.floor(Math.random() * chars.length)];
    }

    return name;
}

export function setupHelmValues(args: HelmArgs): string {
    const filename = `.fm/helm-${generateRandomName(16)}`;

    fs.writeFileSync(filename, JSON.stringify(args));

    return filename;
}

export function cleanupHelmValues(filename: string) {
    fs.unlinkSync(filename);
}

export function del(context: HelmContext, release: string, purge = false): boolean {
    const args = parseHelmDeleteArgs(context, purge);
    const argsText = args.map(fmt).join(' ');

    console.log();
    console.log(a`\{lb,u helm delete ${argsText} ${release}\}`);
    const result = ChildProcess.spawnSync(
        'helm', ['delete', release].concat(args),
        {
            stdio: 'inherit',
        },
    );

    if (result.error) {
        console.error(a`\{lr Helm delete failed!\}`);
        console.error(result.error);
        return false;
    }
    if (result.status !== 0) {
        console.error(a`\{lr Helm delete failed!\}`);
        return false;
    }

    console.log(a`\{g Ok\}`);

    return true;
}

export function parseHelmDeleteArgs(context: HelmContext, purge: boolean): string[] {
    const args: string[] = [];

    if (purge) {
        args.push('--purge');
    }
    if (context.dryrun) {
        args.push('--dry-run');
    }

    args.push('--kube-context', context.branch.cluster);

    return args;
}

export interface HelmContextProd extends HelmContext {
    branch: {
        namespace: string,
        cluster: string,
        registry?: string,
        helmArgs?: {[argName: string]: string},
        chartmuseum: string,
        version: string,
    };
}

export function push(context: HelmContextProd, service: string): boolean {
    const args = parseHelmPushArgs(context, service);
    const argsText = args.map(fmt).join(' ');

    console.log();
    console.log(a`\{lb,u helm push ${argsText}\}`);
    const result = ChildProcess.spawnSync(
        'helm', ['push'].concat(args),
        {
            stdio: 'inherit',
        },
    );

    if (result.error) {
        console.error(a`\{lr Helm push failed!\}`);
        console.error(result.error);
        return false;
    }
    if (result.status !== 0) {
        console.error(a`\{lr Helm push failed!\}`);
        return false;
    }

    console.log(a`\{g Ok\}`);

    return true;
}

export function parseHelmPushArgs(context: HelmContextProd, service: string): string[] {
    const args: string[] = [];

    args.push(`fm/${service}/`);
    args.push(context.branch.chartmuseum);

    args.push('--version', context.branch.version);

    return args;
}

export function pkg(context: HelmContext, service: string, version: string): string | false {
    const args = parseHelmPackageArgs(context, service, version);
    const argsText = args.map(fmt).join(' ');

    console.log();
    console.log(a`\{lb,u helm package ${argsText}\}`);
    const result = ChildProcess.spawnSync(
        'helm', ['package'].concat(args),
        {
            stdio: 'inherit',
        },
    );

    if (result.error) {
        console.error(a`\{lr Helm package failed!\}`);
        console.error(result.error);
        return false;
    }
    if (result.status !== 0) {
        console.error(a`\{lr Helm package failed!\}`);
        return false;
    }

    console.log(a`\{g Ok\}`);

    return `.fm/${service}-${version}.tgz`;
}

export function parseHelmPackageArgs(context: HelmContext, service: string, version: string): string[] {
    const args: string[] = [];

    args.push(`fm/${service}`);

    args.push('-d', '.fm');
    args.push('--version', version);

    args.push('--kube-context', context.branch.cluster);

    return args;
}
