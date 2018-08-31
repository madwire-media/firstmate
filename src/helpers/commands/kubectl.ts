import * as ChildProcess from 'child_process';

import { a, fmt } from '../cli';

export function hasNamespace(cluster: string, namespace: string): boolean {
    const result = ChildProcess.spawnSync(
        'kubectl', ['--context', cluster, 'get', 'ns', namespace],
    );

    if (result.error) {
        console.error(a`\{lr Kubectl get ns failed!\}`);
        console.error(result.error);
        return false;
    }
    if (result.status !== 0) {
        return false;
    }

    return true;
}

export function createNamespace(cluster: string, namespace: string): boolean {
    console.log();
    console.log(a`\{lb,u kubectl --context ${fmt(cluster)} create ns ${fmt(namespace)}\}`);
    const result = ChildProcess.spawnSync(
        'kubectl', ['--context', cluster, 'create', 'ns', namespace],
        {
            stdio: 'inherit',
        },
    );

    if (result.error) {
        console.error(a`\{lr Kubectl create ns failed!\}`);
        console.error(result.error);
        return false;
    }
    if (result.status !== 0) {
        console.error(a`\{lr Kubectl create ns failed!\}`);
        return false;
    }

    return true;
}

export function deleteNamespace(cluster: string, namespace: string): boolean {
    console.log();
    console.log(a`\{lb,u kubectl --context ${fmt(cluster)} create ns ${fmt(namespace)}\}`);
    const result = ChildProcess.spawnSync(
        'kubectl', ['--context', cluster, 'delete', 'ns', namespace],
        {
            stdio: 'inherit',
        },
    );

    if (result.error) {
        console.error(a`\{lr Kubectl delete ns failed!\}`);
        console.error(result.error);
        return false;
    }
    if (result.status !== 0) {
        console.error(a`\{lr Kubectl create ns failed!\}`);
        return false;
    }

    return true;
}
