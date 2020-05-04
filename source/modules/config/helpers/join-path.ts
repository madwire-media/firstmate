import Path from 'path';
import { ModulePath } from '../types/common/config-names';

export function joinModulePaths(...paths: ModulePath[]): ModulePath {
    return Path.posix.join(...paths) as ModulePath;
}
