import ChildProcess from 'child_process';
import { defer } from '@madwire-media/defer';
import { Injectable, context } from '@madwire-media/di-container';
import { PromiseResult, Result } from '@madwire-media/result';
import { RequiresLogger } from '../../logger';
import {
    CommandRunner, Command, CommandResult, PipedCommandOutput,
} from '..';
import { lt } from '../../logger/types';
import { formatArgs } from '../helpers/escape';

// TODO: add ChildProcess to the open-sourced injectable implementations
type Dependencies = RequiresLogger;

export class DefaultCommandRunner
    extends Injectable<Dependencies>
    implements CommandRunner
// eslint-disable-next-line @typescript-eslint/brace-style
{
    private spawn(command: Command): ChildProcess.ChildProcessWithoutNullStreams {
        const args = command.toArgs();
        let executable;

        if (args.length === 0) {
            throw new Error('Command rendered out empty');
        } else {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            executable = args.shift()!;
        }

        let cwd;
        if (command.getCwd) {
            cwd = command.getCwd();
        }

        let env;
        if (command.getEnv) {
            env = {
                ...process.env,
                ...command.getEnv(),
            };
        }

        return ChildProcess.spawn(executable, args, {
            cwd,
            env,
        });
    }

    public async run(command: Command): PromiseResult<CommandResult, Error> {
        const { logger } = this[context];

        logger.info`${lt.command(formatArgs(command.toArgs()))}`;

        const child = this.spawn(command);

        let stdout = '';
        let stdoutBuf = '';
        let stderr = '';
        let stderrBuf = '';
        let status: number;
        let locks = 3;
        const { resolve, reject, promise } = defer();

        const unlock = () => {
            locks -= 1;

            if (locks === 0) {
                resolve();
            }
        };

        child.stdout.on('data', (chunk) => {
            stdout += chunk;

            const lines = (stdoutBuf + chunk).split('\n');
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            stdoutBuf = lines.pop()!;

            for (const line of lines) {
                logger.info`${lt.stdout(line)}`;
            }
        });
        child.stdout.on('end', unlock);
        child.stdout.on('error', reject);

        child.stderr.on('data', (chunk) => {
            stderr += chunk;

            const lines = (stderrBuf + chunk).split('\n');
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            stderrBuf = lines.pop()!;

            for (const line of lines) {
                logger.info`${lt.stderr(line)}`;
            }
        });
        child.stderr.on('end', unlock);
        child.stderr.on('error', reject);

        child.on('error', reject);
        child.on('exit', (code) => {
            status = code || 0;
            unlock();
        });

        try {
            await promise;
        } catch (error) {
            return Result.Err(error);
        }

        logger.info``;

        return Result.Ok({
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            status: status!,
            stdout,
            stderr,
        });
    }

    public runPiped(command: Command): PipedCommandOutput {
        const child = this.spawn(command);

        const result = new Promise<Result<number, Error>>((resolve) => {
            child.on('exit', (code) => {
                resolve(Result.Ok(code || 0));
            });
            child.on('error', (error) => {
                resolve(Result.Err(error));
            });
        });

        return {
            result,
            stdin: child.stdin,
            stdout: child.stdout,
            stderr: child.stderr,
        };
    }

    public async runHidden(command: Command): PromiseResult<CommandResult, Error> {
        const child = this.spawn(command);

        let stdout = '';
        let stderr = '';
        let status: number;
        let locks = 3;
        const { resolve, reject, promise } = defer();

        const unlock = () => {
            locks -= 1;

            if (locks === 0) {
                resolve();
            }
        };

        child.stdout.on('data', (chunk) => { stdout += chunk; });
        child.stdout.on('end', unlock);
        child.stdout.on('error', reject);

        child.stderr.on('data', (chunk) => { stderr += chunk; });
        child.stderr.on('end', unlock);
        child.stderr.on('error', reject);

        child.on('error', reject);
        child.on('exit', (code) => {
            status = code || 0;
            unlock();
        });

        try {
            await promise;
        } catch (error) {
            return Result.Err(error);
        }

        return Result.Ok({
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            status: status!,
            stdout,
            stderr,
        });
    }
}
