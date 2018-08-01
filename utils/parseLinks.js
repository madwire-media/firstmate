#!/usr/bin/env nodejs

const fs = require('fs');
const path = require('path');
const util = require('util');

const templateRootDir = path.join(__dirname, '../templates');

const types = [
    'buildContainer',
    'dockerDeployment',
    'dockerImage',
    'pureHelm',
];

for (let templateTypeDir of types) {
    templateTypeDir = path.join(templateRootDir, templateTypeDir);

    const templates = fs.readdirSync(templateTypeDir);

    for (const template of templates) {
        const templateDir = path.join(templateTypeDir, template);

        const links = [];
        const pathStack = [[templateDir]];

        while (pathStack.length > 0) {
            let currentPath = '';
            for (const frame of pathStack) {
                currentPath = path.join(currentPath, frame[0]);
            }

            const stat = fs.lstatSync(currentPath);

            if (stat.isSymbolicLink()) {
                const link = [
                    {r: path.relative(templateDir, currentPath), a: currentPath},
                ];
                let nextLink = currentPath;
                let isInvalid = new Set();
                let nextLinkStat;

                do {
                    let cwd = path.dirname(nextLink);
                    nextLink = fs.readlinkSync(nextLink);

                    if (path.isAbsolute(nextLink)) {
                        isInvalid.add('absolute');
                    }
                    let a = path.resolve(cwd, nextLink);
                    let r = path.relative(templateRootDir, a);

                    if (link.some((linkPart) => linkPart.a == a)) {
                        isInvalid.add('recursive');
                        link.push({r, a});
                        break;
                    }

                    link.push({r, a});
                    nextLink = a;

                    try {
                        nextLinkStat = fs.lstatSync(nextLink);
                    } catch (error) {
                        isInvalid.add('broken');
                        break;
                    }
                } while (nextLinkStat.isSymbolicLink());

                if (isInvalid.size > 0) {
                    if (isInvalid.has('broken')) {
                        console.error(`Link is broken`);
                    }
                    if (isInvalid.has('absolute')) {
                        console.error(`Link has absolute path(s)`);
                    }
                    if (isInvalid.has('recursive')) {
                        console.error(`Link is recursive`);
                    }

                    console.error(link);
                    console.error();
                }

                links.push(link.map(({r}) => r));
            } else if (stat.isDirectory()) {
                const frame = fs.readdirSync(currentPath);

                if (frame.length > 0) {
                    pathStack.push(frame);
                    continue;
                }
            }

            while (pathStack.length > 0 && pathStack[pathStack.length - 1].length === 1) {
                pathStack.pop();
            }
            if (pathStack.length > 0) {
                pathStack[pathStack.length - 1].shift();
            }
        }

        let buf = '';

        for (const link of links) {
            buf += `${link[0]}\n`;

            for (const part of link.slice(1)) {
                buf += `  -> ${part}\n`;
            }

            buf += '\n';
        }

        const linksFile = path.join(templateDir, '.links');
        if (buf) {
            fs.writeFileSync(linksFile, buf);
        } else if (fs.existsSync(linksFile)) {
            fs.unlinkSync(linksFile);
        }
    }
}
