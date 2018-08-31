import * as fs from 'fs';
import * as readline from 'readline';

import * as Hjson from 'hjson';
import * as mkdirp from 'mkdirp';

import { a } from './cli';

import { Config, ConfigBase } from '../config';
import { parseUserConfig, User } from '../user';

export function loadConfigRaw(context: any): [ConfigBase, string, boolean] | undefined {
    let filename;
    let isHjson;
    const filename1 = `firstmate.hjson`;
    const filename2 = `firstmate.json`;

    const file1Exists = fs.existsSync(filename1);
    const file2Exists = fs.existsSync(filename2);

    if (!file1Exists && !file2Exists) {
        if (context) {
            context.cliMessage(a`\{e,lr,t Could not find \{nt,m ${filename1}\} file\}`);
        } else {
            console.error(a`\{lr Could not find \{m ${filename1}\} file\}`);
        }
        return;
    }

    if (file1Exists) {
        filename = filename1;
        isHjson = true;
    } else {
        filename = filename2;
        isHjson = false;
    }

    let file;
    try {
        file = fs.readFileSync(filename, 'utf8');
    } catch (error) {
        if (context) {
            context.cliMessage(a`\{lr,t Could not read \{nt,m ${filename}\} file: \{nt ${error.message}\}\}`);
        } else {
            console.error(a`\{lr Could not read \{m ${filename}\} file\}: ${error.message}`);
        }
        return;
    }

    let data;
    try {
        if (isHjson) {
            data = Hjson.rt.parse(file);
        } else {
            data = JSON.parse(file);
        }
    } catch (error) {
        if (context) {
            context.cliMessage(a`\{lr,t Could not parse \{nt,m ${filename}\} file: \{nt ${error.message}\}\}`);
        } else {
            console.error(a`\{lr Could not parse \{m ${filename}\} file\}: ${error.message}`);
        }
        return;
    }

    return [data, filename, isHjson];
}

export function loadConfig(context: any): Config | undefined {
    const raw = loadConfigRaw(context);

    if (raw === undefined) {
        return;
    }
    const [data, filename] = raw;

    let parseResult;
    try {
        parseResult = Config.parseRaw(data);
    } catch (error) {
        if (context) {
            context.cliMessage(a`\{lr,t Could not parse \{nt,m ${filename}\} file: \{nt ${error.message}\}\}`);
        } else {
            console.error(a`\{lr Could not parse \{m ${filename}\} file\}: ${error.message}`);
        }
        return;
    }

    if (!(parseResult instanceof Config)) {
        if (context) {
            context.cliMessage(a`\{lr,t Could not parse \{nt,m ${filename}\} file: \{nt Invalid schema\}`);
        } else {
            console.error(a`\{lr Could not parse \{m ${filename}\} file\}: Invalid schema`);
        }

        for (const error of parseResult) {
            if (context) {
                context.cliMessage(a`${a.e}  at \{c ${error.dataPath
                    }\}: \{lr ${error.message}\} (${error.schemaPath})`);
            } else {
                console.error(a`  at \{c ${error.dataPath}\}: \{lr ${error.message}\} (${error.schemaPath})`);
            }
        }

        return;
    }

    return parseResult;
}

export async function loadUser(): Promise<User | undefined> {
    const dir = `${process.env.HOME}/.local/share/firstmate`;
    const file = `${dir}/user.json`;

    if (!fs.existsSync(dir)) {
        mkdirp.sync(dir);
    }

    if (!fs.existsSync(file)) {
        const user = await newUser();

        if (user === undefined) {
            return undefined;
        }

        fs.writeFileSync(file, JSON.stringify(user, null, 2));

        return user;
    } else {
        return parseUserConfig(JSON.parse(fs.readFileSync(file, 'utf8')));
    }
}

export async function newUser(firstTime = true, oldData?: User): Promise<User | undefined> {
    if (firstTime) {
        console.log(a`\{lw It looks like this is your first time using FirstMate,${''
            } please fill out the fields below to begin\}`);
    }

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const name = await new Promise((resolve: (s: string) => void) => {
        rl.question('Name (author field): ', resolve);

        if (oldData !== undefined && oldData.name !== undefined) {
            rl.write(oldData.name);
        }
    });

    if (name === '') {
        console.error(a`\{lr Not a valid name '\{w ${name}\}'\}`);

        rl.close();
        return undefined;
    }

    rl.close();
    return {
        name,
    };
}
