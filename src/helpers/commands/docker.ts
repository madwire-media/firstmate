import * as ChildProcess from 'child_process';

import { Port } from '../../serviceTypes/base/branch';
import { a, fmt, interrupt } from '../cli';
import { SigIntHandler } from '../service';

export function build(
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

export function push(imageName: string, registry: string): boolean {
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

export function createNetwork(networkName: string): boolean {
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

export function networkExists(networkName: string): boolean {
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

export function deleteNetwork(networkName: string): boolean {
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

export function containerExists(containerName: string): boolean {
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

export function removeContainer(containerName: string): boolean {
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

export interface RunOptions {
    image: string;
    name: string;
    volumes?: {[dest: string]: string};
    network?: string;
    ports?: Port[];
    command?: string;
    rm?: boolean;
}
export function run(options: RunOptions): boolean {
    const {args, argsText} = parseArgs(options);

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
export function runAsync(options: RunOptions): SigIntHandler {
    const {args, argsText} = parseArgs(options);

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
export function parseArgs(options: RunOptions): {args: string[], argsText: string} {
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
        for (const dest in options.volumes) {
            let src = options.volumes[dest];

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

export function pull(registry: string, imageName: string, tag: string): boolean {
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
