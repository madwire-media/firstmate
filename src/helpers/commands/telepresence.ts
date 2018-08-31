import * as ChildProcess from 'child_process';

import { a, fmt, interrupt } from '../cli';
import { SigIntHandler } from '../service';

import * as docker from './docker';

export interface RunOptions extends docker.RunOptions {
    deployment: string;
    container: string;
    cluster: string;
    namespace: string;
}
export function runAsync(options: RunOptions): SigIntHandler {
    const {args: dockerArgs, argsText: dockerArgsText} = docker.parseArgs(options);

    const args = [];
    let argsText = '';

    args.push('--context', options.cluster);
    argsText += ` --context ${fmt(options.cluster)}`;

    args.push('--namespace', options.namespace);
    argsText += ` --namespace ${fmt(options.namespace)}`;

    args.push('--deployment', options.deployment);
    argsText += ` --deployment ${fmt(options.deployment)}`;

    args.push('--mount', '/tmp/telepresence');
    argsText += ` --mount /tmp/telepresence`;

    args.push('--docker-run', ...dockerArgs);
    argsText += ` --docker-run ${dockerArgsText}`;

    console.log();
    console.log(a`\{lb,u telepresence${argsText}\}`);
    console.log(a`\{ld (async)\}`);
    const cp = ChildProcess.spawn(
        'telepresence', args,
    );

    let closed = false;
    cp.on('error', (error) => {
        console.error(a`\{lr Telepresence run (async) failed!\}`);
        console.error(error);
        interrupt();
    });
    cp.on('close', () => {
        closed = true;
        interrupt();
    });

    let stdoutBuf = '';
    let stderrBuf = '';
    cp.stdout.on('data', (chunk) => {
        stdoutBuf += chunk;
        const lines = stdoutBuf.split('\n');
        stdoutBuf = lines.pop()!;

        for (const line of lines) {
            console.log(a`\{lb telepresence --docker-run ${fmt(options.image)}\}: ${line}`);
        }
    });
    cp.stderr.on('data', (chunk) => {
        stderrBuf += chunk;
        const lines = stderrBuf.split('\n');
        stderrBuf = lines.pop()!;

        for (const line of lines) {
            console.error(a`\{lb telepresence --docker-run ${fmt(options.image)}\}: ${line}`);
        }
    });

    return async () => {
        if (closed) {
            return false;
        } else {
            cp.kill('SIGINT');

            // Polling wait for process to finish
            await new Promise((resolve: (r: false | undefined) => void) => {
                const interval = setInterval(() => {
                    if (closed) {
                        resolve(undefined);
                        clearInterval(interval);
                    }
                }, 10);
            });

            if (stdoutBuf.length > 0) {
                console.log(a`\{lb telepresence --docker-run ${fmt(options.image)}\}: ${stdoutBuf}`);
            }
            if (stderrBuf.length > 0) {
                console.log(a`\{lb telepresence --docker-run ${fmt(options.image)}\}: ${stderrBuf}`);
            }
        }
    };
}

let tpVersion: string;
export function version(): string {
    if (tpVersion) {
        return tpVersion;
    }

    const result = ChildProcess.spawnSync(
        'telepresence', ['--version'],
    );

    if (result.error) {
        console.error(a`\{lr Telepresence version failed!\}`);
        console.error(result.error);
        return '0.90';
    }
    if (result.status !== 0) {
        return '0.90';
    }

    tpVersion = result.stdout.toString().trim();

    return tpVersion;
}
