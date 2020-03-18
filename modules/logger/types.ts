export type LogData =
    | LogPartial
    | LogPath
    | LogBranch
    | LogSuggestions
    | LogCommand
    | LogModule
    | LogService
    | LogInput
    | LogEnvironment
    | LogError;

export interface LogPartial {
    type: 'partial';
    strings: ReadonlyArray<string>;
    data: LogData[];
}

export interface LogPath {
    type: 'path';
    path: string;
}

export interface LogBranch {
    type: 'branch';
    branch: string;
}

export interface LogSuggestions {
    type: 'suggestions';
    question: string;
    suggestions: LogPartial[];
}

export interface LogCommand {
    type: 'command';
    command: string;
}

export interface LogModule {
    type: 'module';
    module: string;
}

export interface LogService {
    type: 'service';
    service: string;
}

export interface LogInput {
    type: 'input';
    input: string;
}

export interface LogEnvironment {
    type: 'environment';
    environment: string;
}

export interface LogError {
    type: 'error';
    error: Error;
}

export const logTypes = {
    partial: (strings: TemplateStringsArray, ...data: LogData[]): LogPartial => ({
        type: 'partial',
        strings,
        data,
    }),
    path: (path: string): LogPath => ({ type: 'path', path }),
    branch: (branch: string): LogBranch => ({ type: 'branch', branch }),
    suggestions: (question: string, suggestions: LogPartial[]): LogSuggestions => ({
        type: 'suggestions',
        question,
        suggestions,
    }),
    command: (command: string): LogCommand => ({ type: 'command', command }),
    module: (module: string): LogModule => ({ type: 'module', module }),
    service: (service: string): LogService => ({ type: 'service', service }),
    input: (input: string): LogInput => ({ type: 'input', input }),
    environment: (environment: string): LogEnvironment => ({ type: 'environment', environment }),
    error: (error: Error): LogError => ({ type: 'error', error }),
};

// Common alias
export const lt = logTypes;
