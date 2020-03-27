import { PromiseResult } from '@madwire-media/result';

export interface Command {
    intoArgs(): string[];
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

export interface CommandRunner {
    run(command: Command): PromiseResult<CommandResult, Error>;
    runSimple(command: Command): PromiseResult<number, Error>;

    runPiped(command: Command): PipedCommandOutput;

    runHidden(command: Command): PromiseResult<CommandResult, Error>;
    runHiddenSimple(command: Command): PromiseResult<number, Error>;
}
