import * as doasync from 'doasync';
import * as fs from 'fs';
import { ncp } from 'ncp';

import { Readable, Writable } from 'stream';
import { a, loadUser } from '../helpers/cli';
import { gitInit } from '../helpers/commands';
import { TemplateProcessor } from '../helpers/template';

export async function newProject(name: string): Promise<boolean> {
    const rootDir = `${__dirname}/../../templates/project`;

    const user = await loadUser();
    if (user === undefined) {
        return false;
    }

    fs.mkdirSync(name);

    console.log(`Copying files`);

    (ncp as any).limit = 32;
    await doasync(ncp)(rootDir, name, {
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

    if (!gitInit(name)) {
        return false;
    }

    console.log(a`\{lg Done\}`);

    return true;
}
