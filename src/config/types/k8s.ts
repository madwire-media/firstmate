import * as t from 'io-ts';
import { AbsoluteFilePath } from './strings';

export interface KubernetesVolumes {
    [absDest: string]: AbsoluteFilePath;
}
export const KubernetesVolumes = t.dictionary(AbsoluteFilePath, AbsoluteFilePath);
