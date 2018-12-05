import * as t from 'io-ts';

import { AbsoluteFilePath, DockerArg, LocalFilePath } from './strings';

export interface DockerVolumes {
    [absDest: string]: LocalFilePath;
}
export const DockerVolumes = t.dictionary(AbsoluteFilePath, LocalFilePath);

export interface DockerArgs {
    [arg: string]: string;
}
export const DockerArgs = t.dictionary(DockerArg, t.string);
