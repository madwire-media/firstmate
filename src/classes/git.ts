import * as fs from 'fs';
import * as GitConfig from 'parse-git-config';

import { a } from './cli';

export function getGitBranch(context: any): string | false {
    let branchName;

    if (!fs.existsSync('.git')) {
        if (context) {
            context.cliMessage('Not a git repository');
        } else {
            console.error(a`\{lr Not a git repository\}`);
        }
        return false;
    }

    if (!fs.existsSync('.git/HEAD')) {
        branchName = '~default';
    } else {
        branchName = fs.readFileSync('.git/HEAD', 'utf8');
        branchName = branchName.substr(branchName.lastIndexOf('/') + 1).trim();
    }

    return branchName;
}

export interface GitBranches {
    remote: string[];
    local: string[];
}
export function getGitBranches(context?: any): GitBranches | false {
    if (!fs.existsSync('.git')) {
        if (context) {
            context.cliMessage('Not a git repository');
        } else {
            console.error(a`\{lr Not a git repository\}`);
        }
        return false;
    }

    const branches: GitBranches = {
        remote: [],
        local: [],
    };

    if (fs.existsSync('.git/refs/remotes/origin')) {
        branches.remote = fs.readdirSync('.git/refs/remotes/origin')
            .filter((s) => s !== 'HEAD');
    }

    branches.local = fs.readdirSync('.git/refs/heads');

    return branches;
}

export function getGitOrigin(context: any): string | false {
    if (!fs.existsSync('.git')) {
        if (context) {
            context.cliMessage('Not a git repository');
        } else {
            console.error(a`\{lr Not a git repository\}`);
        }
        return false;
    }

    if (fs.existsSync('.git/config')) {
        const config = GitConfig.sync();

        if (config['remote "origin"'] !== undefined) {
            if (config['remote "origin"'].url !== undefined) {
                return config['remote "origin"'].url;
            }
        }
    }

    // No origin found
    if (context) {
        context.cliMessage('Git repository does not have remote "origin"');
    } else {
        console.error(a`\{lr Git repository does not have remote "origin"\}`);
    }

    return false;
}
