import * as fs from 'fs';
import { ncp } from 'ncp';
import { promisify } from 'util';

import { Readable, Writable } from 'stream';
import { a } from '../helpers/cli';
import * as git from '../helpers/commands/git';
import { loadUser } from '../helpers/config';
import { TemplateProcessor } from '../helpers/template';

export async function newProject(name: string): Promise<boolean> {
    const rootDir = `${__dirname}/../../templates/project`;

    const user = await loadUser();
    if (user === undefined) {
        return false;
    }

    fs.mkdirSync(name);

    console.log(`Copying files`);

    await promisify(ncp as any)(rootDir, name, {
        dereference: true,
        transform: (read: Readable, write: Writable) => {
            const proc = new TemplateProcessor({vars: {
                project: name,
                author: user.name,
            }});

            read.pipe(proc);
            proc.pipe(write);
        },
    });

    console.log(`Initializing Git Repository`);

    if (!git.init(name)) {
        return false;
    }

    console.log(a`\{lg Done\}`);

    return true;
}
