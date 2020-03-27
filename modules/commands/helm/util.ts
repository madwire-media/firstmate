const helmVersionRegex = /version\.BuildInfo\{Version:"([^"]+)", GitCommit:"([0-9a-f]{40})", GitTreeState:"(\w+)", GoVersion:"([^"]+)"}/;

export interface HelmVersion {
    version: string;
    gitCommit: string;
    gitTreeState: string;
    goVersion: string;
}

export function parseHelmVersion(version: string): HelmVersion | null {
    const result = helmVersionRegex.exec(version);

    if (result === null) {
        return null;
    }

    return {
        version: result[1],
        gitCommit: result[2],
        gitTreeState: result[3],
        goVersion: result[4],
    };
}
