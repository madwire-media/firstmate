import * as ChildProcess from 'child_process';
import * as fs from 'fs';

import { HelmArgs, HelmVersion } from '../../config/types/helm';
import { LocalFilePath } from '../../config/types/strings';
import { helmCommand } from '../../main';
import { a, fmt } from '../cli';

export function hasRelease(
    cluster: string,
    release: string,
    namespace: string,
    helmVersion?: HelmVersion,
): boolean {
    const nsArgs = [];

    if (helmVersion !== 2) {
        nsArgs.push('-n', namespace);
    }

    const result = ChildProcess.spawnSync(
        helmCommand, ['status', ...nsArgs, '--kube-context', cluster, release],
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
        helmArgFiles?: LocalFilePath[],
        recreatePods?: boolean,
        version?: string,
        helmVersion?: 2 | 3;
        noEnv?: boolean;
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

    const releaseExists = hasRelease(
        context.branch.cluster,
        release,
        context.branch.namespace,
        context.branch.helmVersion,
    );

    if (releaseExists) {
        action = ['upgrade', release].concat(chart);
        actionText = `upgrade ${fmt(release)} ${chartText}`;

        if (context.branch.recreatePods && !context.telepresenceContainer) {
            args.push('--recreate-pods');
            argsText += ' --recreate-pods';
        }
    } else {
        if (context.branch.helmVersion === 2) {
            action = ['install', '-n', release].concat(chart);
            actionText = `install -n ${fmt(release)} ${chartText}`;
        } else {
            action = ['install', release].concat(chart);
            actionText = `install ${fmt(release)} ${chartText}`;
        }
    }

    console.log();
    console.log(a`\{lb,u helm ${actionText} ${argsText}\}`);
    const result = ChildProcess.spawnSync(
        helmCommand, action.concat(args),
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

    if (context.branch.helmArgFiles) {
        for (const file of context.branch.helmArgFiles) {
            args.push('-f', file);
        }
    }

    if (!context.branch.noEnv) {
        args.push('--set', `env=${context.env}`);
    }

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
        helmCommand, ['delete'].concat(args).concat([release]),
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

    if (context.branch.helmVersion !== 2) {
        args.push('-n', context.branch.namespace);
    }

    if (purge && context.branch.helmVersion === 2) {
        args.push('--purge');
    } else if (!purge && context.branch.helmVersion !== 2) {
        args.push('--keep-history');
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
        helmCommand, ['push'].concat(args),
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
        helmCommand, ['package'].concat(args),
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
