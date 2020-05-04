import { PromiseResult } from '@madwire-media/result';

export interface RequiresCommandRunner {
    commandRunner: CommandRunner;
}

export interface CommandRunner {
    run(command: Command): PromiseResult<CommandResult, Error>;
    runPiped(command: Command): PipedCommandOutput;
    runHidden(command: Command): PromiseResult<CommandResult, Error>;
}

export interface Command {
    getCwd?(): string | undefined;
    getEnv?(): {[key: string]: string};
    toArgs(): string[];
}

export interface CommandResult {
    status: number;
    stdout: string;
    stderr: string;
}

export interface PipedCommandOutput {
    result: PromiseResult<number, Error>;
    stdin: NodeJS.WritableStream;
    stdout: NodeJS.ReadableStream;
    stderr: NodeJS.ReadableStream;
}
