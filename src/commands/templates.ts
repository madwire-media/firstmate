import * as fs from 'fs';

import { a } from '../helpers/cli';

export function templates(type?: string) {
    if (type) {
        switch (type) {
            case 'build':
            case 'buildContainer':
                printTemplates('buildContainer');
                break;

            case 'deploy':
            case 'dockerDeployment':
                printTemplates('dockerDeployment');
                break;

            case 'image':
            case 'dockerImage':
                printTemplates('dockerImage');
                break;

            case 'helm':
            case 'pureHelm':
                printTemplates('pureHelm');
                break;

            default:
                console.error(a`\{lr Unimplemented template type ${type}\}`);
                break;
        }
    } else {
        printTemplates('buildContainer');
        printTemplates('dockerDeployment');
        printTemplates('dockerImage');
        printTemplates('pureHelm');
    }
}

function printTemplates(type: string) {
    const templateDir = `${__dirname}/../../templates/${type}`;
    const templates = fs.readdirSync(templateDir);

    console.log(a`\{g ${type}\}:`);

    for (const template of templates) {
        console.log(a`    \{y ${template}\}`);
    }
}
