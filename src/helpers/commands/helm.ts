import * as ChildProcess from 'child_process';

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
        helmArgs?: {[argName: string]: string},
    };
    env: string;
    dockerImages?: {[container: string]: string};
    telepresenceContainer?: string;
    dryrun?: boolean;
}
export function install(cwd: string, context: HelmContext, release: string): boolean {
    const args = parseHelmInstallArgs(context);
    const argsText = args.map(fmt).join(' ');

    let action;
    let actionText;

    if (hasRelease(context.branch.cluster, release)) {
        action = ['upgrade', release, '--force'];
        actionText = `upgrade ${fmt(release)} --force`;
    } else {
        action = ['install', '-n', release];
        actionText = `install -n ${fmt(release)}`;
    }

    console.log();
    console.log(a`\{lb,u cd ${cwd} && helm ${actionText} ${argsText} .\}`);
    const result = ChildProcess.spawnSync(
        'helm', action.concat(args).concat(['.']),
        {
            cwd,
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

    console.log(a`\{g Ok\}`);

    return true;
}

export function parseHelmInstallArgs(context: HelmContext): string[] {
    const args: string[] = [];

    if (context.dryrun) {
        args.push('--dry-run');
    }

    if (context.dockerImages !== undefined && context.branch.registry !== undefined) {
        for (const container in context.dockerImages) {
            const image = context.dockerImages[container];

            if (context.telepresenceContainer === container) {
                args.push('--set', `images.${container}=${image}`);
            } else {
                args.push('--set', `images.${container}=${context.branch.registry}/${image}`);
            }
        }
    }

    if (context.branch.helmArgs !== undefined) {
        for (const argName in context.branch.helmArgs) {
            const arg = context.branch.helmArgs[argName];

            args.push('--set', `${argName}=${arg}`);
        }
    }

    args.push('--set', `env=${context.env}`);

    args.push('--kube-context', context.branch.cluster);
    args.push('--namespace', context.branch.namespace);

    return args;
}

export function del(context: HelmContext, release: string): boolean {
    const args = parseHelmDeleteArgs(context);
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

export function parseHelmDeleteArgs(context: HelmContext): string[] {
    const args: string[] = [];

    if (context.dryrun) {
        args.push('--dry-run');
    }

    args.push('--kube-context', context.branch.cluster);

    return args;
}
