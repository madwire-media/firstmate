export interface RequiresGenerate {
    generate: Generate;
}

export interface Generate {
    uniqueId(): string;
    uniqueSession(): string;
    uniqueTmpFile(): string;
}
