export interface RequiresProcess {
    process: Process;
}

export interface Process {
    cwd(): string;
}
