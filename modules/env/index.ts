export interface RequiresEnv {
    env: Env;
}

export interface Env {
    readonly projectRoot: string;

    toPwdRelative(path: string): string;
}
