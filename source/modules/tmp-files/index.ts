import { PromiseResult } from '@madwire-media/result';

export interface TmpFiles {
    init(): PromiseResult<void, Error>;
    createSession(): PromiseResult<TmpFilesSession, Error>;
}

export interface TmpFilesSession {
    readonly mainDir: string;

    createNewArtifactDir(): PromiseResult<string, Error>;

    cleanup(): PromiseResult<void, Error>;
}
