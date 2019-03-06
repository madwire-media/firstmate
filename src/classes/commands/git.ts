import * as ChildProcess from 'child_process';

import { a } from '../cli';

export function init(cwd: string): boolean {
    const result = ChildProcess.spawnSync(
        'git', ['init'],
        {
            cwd,
            stdio: [
                'pipe',
                'pipe',
                'inherit',
            ],
        },
    );

    if (result.error) {
        console.error(a`\{lr Git init failed!\}`);
        console.error(result.error);
        return false;
    }
    if (result.status !== 0) {
        return false;
    }

    return true;
}
