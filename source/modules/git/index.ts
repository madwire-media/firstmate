import { PromiseResult } from '@madwire-media/result';
import { BranchName } from '../config/types/common/git';

export interface RequiresGit {
    git: Git;
}

export interface Git {
    getCurrentBranch(): PromiseResult<BranchName, Error>;
}
