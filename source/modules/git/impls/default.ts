import Git from 'nodegit';
import { PromiseResult, Result } from '@madwire-media/result';
import { RequiresProcess } from '@madwire-media/process';
import { Injectable, context } from '@madwire-media/di-container';
import type { Git as GitInterface } from '..';
import { BranchName } from '../../config/types/common/git';

export type Dependencies = RequiresProcess;

export class DefaultGit
    extends Injectable<Dependencies>
    implements GitInterface
// eslint-disable-next-line @typescript-eslint/brace-style
{
    private repo: Git.Repository | undefined;

    public async getCurrentBranch(): PromiseResult<BranchName, Error> {
        try {
            const repo = await this.openRepo();
            const branch = await repo.getCurrentBranch();

            return Result.Ok(branch.name() as BranchName);
        } catch (error) {
            return Result.Err(error);
        }
    }

    private async openRepo() {
        const { process } = this[context];

        if (this.repo === undefined) {
            this.repo = await Git.Repository.open(process.cwd());
        }

        return this.repo;
    }
}
