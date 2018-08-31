import * as ChildProcess from 'child_process';
import * as path from 'path';

import { Port } from '../serviceTypes/base/branch';
import { a, fmt, interrupt } from './cli';
import { SigIntHandler } from './service';

export function gitInit(cwd: string): boolean {
    const result = ChildProcess.spawnSync(
        'git', ['init'],
        {
            cwd,
            stdio: [
                'pipe',
                'pipe',
                'inherit',
            ],
        },
    );

    if (result.error) {
        console.error(a`\{lr Git init failed!\}`);
        console.error(result.error);
        return false;
    }
    if (result.status !== 0) {
        return false;
    }

    return true;
}

export function dockerBuild(
    cwd: string,
    imageName: string,
    tag: string = 'latest',
    buildArgs?: {[key: string]: string},
): boolean {
    const localTag = `${imageName}:${tag}`;

    const args = [localTag];
    let argsText = `${fmt(localTag)}`;

    if (buildArgs !== undefined) {
        for (const key in buildArgs) {
            const value = buildArgs[key];

            args.push('--build-arg', `${key}=${value}`);
            argsText += ` --build-arg ${fmt(`${key}=${value}`)}`;
        }
    }

    console.log();
    console.log(a`\{lb,u cd ${cwd} && docker build -t ${argsText} .\}`);
    const result = ChildProcess.spawnSync(
        'docker', ['build', '-t'].concat(args).concat(['.']),
        {
            cwd,
            stdio: 'inherit',
        },
    );

    if (result.error) {
        console.error(a`\{lr Docker build failed!\}`);
        console.error(result.error);
        return false;
    }
    if (result.status !== 0) {
        console.error(a`\{lr Docker build failed!\}`);
        return false;
    }

    console.log(a`\{g Ok\}`);

    return true;
}

export function dockerPush(imageName: string, registry: string): boolean {
    const remoteTag = `${registry}/${imageName}`;
    const localTag = `${imageName}`;

    console.log();
    console.log(a`\{lb,u docker tag ${fmt(localTag)} ${fmt(remoteTag)} && docker push ${fmt(remoteTag)}\}`);
    const tagResult = ChildProcess.spawnSync(
        'docker', ['tag', localTag, remoteTag],
        {
            stdio: 'inherit',
        },
    );

    if (tagResult.error) {
        console.error(a`\{lr Docker tag failed!\}`);
        console.error(tagResult.error);
        return false;
    }
    if (tagResult.status !== 0) {
        console.error(a`\{lr Docker tag failed!\}`);
        return false;
    }

    const pushResult = ChildProcess.spawnSync(
        'docker', ['push', remoteTag],
        {
            stdio: 'inherit',
        },
    );

    if (pushResult.error) {
        console.error(a`\{lr Docker push failed!\}`);
        console.error(pushResult.error);
        return false;
    }
    if (pushResult.status !== 0) {
        console.error(a`\{lr Docker push failed!\}`);
        return false;
    }

    console.log(a`\{g Ok\}`);

    return true;
}

export function dockerCreateNetwork(networkName: string): boolean {
    console.log();
    console.log(a`\{lb,u docker network create ${fmt(networkName)}\}`);
    const result = ChildProcess.spawnSync(
        'docker', ['network', 'create', networkName],
        {
            stdio: ['inherit', 'ignore', 'inherit'],
        },
    );

    if (result.error) {
        console.error(a`\{lr Docker network create failed!\}`);
        console.error(result.error);
        return false;
    }
    if (result.status !== 0) {
        console.error(a`\{lr Docker network create failed!\}`);
        return false;
    }

    console.log(a`\{g Ok\}`);

    return true;
}

export function dockerNetworkExists(networkName: string): boolean {
    const result = ChildProcess.spawnSync(
        'docker', ['network', 'ls', '-f', `name=${networkName}`, '--format', '{{.Name}}'],
    );

    if (result.error) {
        console.error(result.error);
        return false;
    }
    if (result.status !== 0) {
        return false;
    }

    return result.output[1].length > 0;
}

export function dockerDeleteNetwork(networkName: string): boolean {
    console.log();
    console.log(a`\{lb,u docker network delete ${fmt(networkName)}\}`);
    const result = ChildProcess.spawnSync(
        'docker', ['network', 'rm', networkName],
        {
            stdio: ['inherit', 'ignore', 'inherit'],
        },
    );

    if (result.error) {
        console.error(a`\{lr Docker network delete failed!\}`);
        console.error(result.error);
        return false;
    }
    if (result.status !== 0) {
        console.error(a`\{lr Docker network delete failed!\}`);
        return false;
    }

    console.log(a`\{g Ok\}`);

    return true;
}

export function dockerContainerExists(containerName: string): boolean {
    const result = ChildProcess.spawnSync(
        'docker', ['ps', '-f', `name=${containerName}`, '--format', '{{.Names}}'],
    );

    if (result.error) {
        console.error(result.error);
        return false;
    }
    if (result.status !== 0) {
        return false;
    }

    return result.output[1].length > 0;
}

export function dockerRemoveContainer(containerName: string): boolean {
    console.log();
    console.log(a`\{lb,u docker rm -f ${fmt(containerName)}\}`);
    const result = ChildProcess.spawnSync(
        'docker', ['rm', '-f', containerName],
        {
            stdio: ['inherit', 'ignore', 'inherit'],
        },
    );

    if (result.error) {
        console.error(result.error);
        return false;
    }
    if (result.status !== 0) {
        return false;
    }

    console.log(a`\{g Ok\}`);

    return true;
}

export interface DockerRunOptions {
    image: string;
    name: string;
    volumes?: {[source: string]: string};
    network?: string;
    ports?: Port[];
    command?: string;
    rm?: boolean;
}
export function dockerRun(options: DockerRunOptions): boolean {
    const {args, argsText} = parseDockerArgs(options);

    console.log();
    console.log(a`\{lb,u docker run${argsText}\}`);
    const result = ChildProcess.spawnSync(
        'docker', ['run'].concat(args),
        {
            stdio: 'inherit',
        },
    );

    if (result.error) {
        console.error(a`\{lr Docker run failed!\}`);
        console.error(result.error);
        return false;
    }
    if (result.status !== 0) {
        console.error(a`\{lr Docker run failed!\}`);
        return false;
    }

    console.log(a`\{g Ok\}`);

    return true;
}
export function dockerRunAsync(options: DockerRunOptions): SigIntHandler {
    const {args, argsText} = parseDockerArgs(options);

    console.log();
    console.log(a`\{lb,u docker run -d${argsText}\}`);
    console.log(a`\{ld (async)\}`);
    const cp = ChildProcess.spawn(
        'docker', ['run'].concat(args),
    );

    let closed = false;
    cp.on('error', (error) => {
        console.error(a`\{lr Docker run (async) failed!\}`);
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
            console.log(a`\{lb docker run ${fmt(options.image)}\}: ${line}`);
        }
    });
    cp.stderr.on('data', (chunk) => {
        stderrBuf += chunk;
        const lines = stderrBuf.split('\n');
        stderrBuf = lines.pop()!;

        for (const line of lines) {
            console.error(a`\{lb docker run ${fmt(options.image)}\}: ${line}`);
        }
    });

    return async () => {
        if (closed) {
            return false;
        } else {
            cp.kill('SIGINT');

            // Polling wait for process to finish
            return new Promise((resolve: (r: false | undefined) => void) => {
                const interval = setInterval(() => {
                    if (closed) {
                        resolve(undefined);
                        clearInterval(interval);
                    }
                }, 10);
            });

            if (stdoutBuf.length > 0) {
                console.log(a`\{lb docker run ${fmt(options.image)}\}: ${stdoutBuf}`);
            }
            if (stderrBuf.length > 0) {
                console.log(a`\{lb docker run ${fmt(options.image)}\}: ${stderrBuf}`);
            }
        }
    };
}
function parseDockerArgs(options: DockerRunOptions): {args: string[], argsText: string} {
    const args = [];
    let argsText = '';

    if (options.rm) {
        argsText += ' --rm';
        args.push('--rm');
    }

    if (process.stdout.isTTY) {
        argsText += ' -t';
        args.push('-t');
    }

    if (options.network !== undefined) {
        argsText += ` --network ${fmt(options.network)}`;
        args.push('--network', options.network);
    }

    if (options.volumes !== undefined) {
        for (let src in options.volumes) {
            const dest = options.volumes[src];

            if (src[0] !== '/') {
                src = `${process.cwd()}/${src}`;
            }

            argsText += ` -v ${fmt(`${src}:${dest}`)}`;
            args.push('-v', `${src}:${dest}`);
        }
    }

    if (options.ports !== undefined) {
        for (const port of options.ports) {
            argsText += ` -p ${port.local}:${port.remote}`;
            args.push('-p', `${port.local}:${port.remote}`);
        }
    }

    argsText += ` --name ${fmt(options.name)}`;
    args.push('--name', options.name);

    argsText += ` ${fmt(options.image)}`;
    args.push(options.image);

    if (options.command !== undefined) {
        argsText += ` ${fmt(options.command)}`;
        args.push(options.command);
    }

    return {args, argsText};
}

export function helmHasRelease(cluster: string, release: string): boolean {
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
export function helmInstall(cwd: string, context: HelmContext, release: string): boolean {
    const args = parseHelmInstallArgs(context);
    const argsText = args.map(fmt).join(' ');

    let action;
    let actionText;

    if (helmHasRelease(context.branch.cluster, release)) {
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

export function helmDelete(context: HelmContext, release: string): boolean {
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

export interface TelepresenceRunOptions extends DockerRunOptions {
    deployment: string;
    container: string;
    cluster: string;
    namespace: string;
}
export function telepresenceRunAsync(options: TelepresenceRunOptions): SigIntHandler {
    const {args: dockerArgs, argsText: dockerArgsText} = parseDockerArgs(options);

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

export function dockerPull(registry: string, imageName: string, tag: string): boolean {
    const remoteTag = `${registry}/${imageName}:${tag}`;

    console.log();
    console.log(a`\{lb,u docker pull ${fmt(remoteTag)}\}`);
    const result = ChildProcess.spawnSync(
        'docker', ['pull', remoteTag],
        {
            stdio: 'inherit',
        },
    );

    if (result.error) {
        console.error(a`\{lr Docker pull failed!\}`);
        console.error(result.error);
        return false;
    }
    if (result.status !== 0) {
        console.error(a`\{lr Docker pull failed!\}`);
        return false;
    }

    console.log(a`\{g Ok\}`);

    return true;
}

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

let tpVersion: string;
export function telepresenceVersion(): string {
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
