import { LogData, LogPartial } from './types';

export interface RequiresLogger {
    logger: Logger;
}

type LogFunction = (strings: TemplateStringsArray, ...data: LogData[]) => void;

export interface Logger {
    trace: LogFunction;
    info: LogFunction;
    success: LogFunction;
    warn: LogFunction;
    error: LogFunction;

    question: (strings: TemplateStringsArray, ...data: LogData[]) => Promise<string>;
    options: (options: string[], question: LogPartial) => Promise<string>;
}
