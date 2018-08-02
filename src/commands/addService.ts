import * as fs from 'fs';
import * as path from 'path';

import * as doasync from 'doasync';
import * as Hjson from 'hjson';
import leven = require('leven');
import * as mkdirp from 'mkdirp';
import { ncp } from 'ncp';

import { Readable, Transform, Writable } from 'stream';
import { Config, ConfigBase } from '../config';
import { a, getGitOrigin, loadConfig, loadConfigRaw, loadUser } from '../helpers/cli';
import { processTemplateS, TemplateProcessor } from '../helpers/template';
import { User } from '../user';

interface ServiceDep {
    suffix: string;
    type: string;
    template: string;
    inheritSource?: boolean;
}

function notATemplate(template: string, templates: string[]) {
    console.log(a`\{lr Template \{w '${template}'\} is not a valid template`);

    let shortest: {t: string | undefined, s: number} = {t: undefined, s: Infinity};

    for (const t of templates) {
        const distance = leven(t, template);

        if (distance < shortest.s) {
            shortest = {t, s: distance};
        }
    }

    if (shortest.s) {
        console.log(a`Did you mean \{lw '${shortest.s}'\}?`);
    }

    console.log(a`\{ld (You can run \{w fm templates\} to list all templates\}`);
}

export async function addService(context: any, service: string, type: string, template: string) {
    (ncp as any).limit = 32;

    const raw = loadConfigRaw(context);
    if (raw === undefined) {
        return false;
    }
    const [rawConfig, configFile, configIsHjson] = raw;

    const config = loadConfig(context);
    if (config === undefined) {
        return false;
    }

    const user = await loadUser();
    if (user === undefined) {
        return false;
    }

    const remote = getGitOrigin(context);
    if (remote === false) {
        return false;
    }

    const templatesRootDir = `${__dirname}/../../templates`;
    const project = process.cwd().substr(process.cwd().lastIndexOf('/') + 1);

    const result = await addSingleService({
        templatesRootDir, rawConfig, config, user, type, template, context,
        name: service, remote, project,
    });
    if (result === false) {
        return false;
    }

    if (configIsHjson) {
        fs.writeFileSync(configFile, Hjson.rt.stringify(rawConfig, {
            bracesSameLine: true,
            space: 4,
        } as any));
    } else {
        fs.writeFileSync(configFile, JSON.stringify(rawConfig, null, 2));
    }

    return true;
}

async function addSingleService({
    templatesRootDir, rawConfig, config, type, template, context, name,
    inheritedSource, user, remote, project,
}: {
    templatesRootDir: string, rawConfig: ConfigBase, config: Config,
    type: string, template: string, context: any, name: string,
    inheritedSource?: string, user: User, remote: string, project: string,
}) {
    if (name in rawConfig) {
        console.error(a`\{lr Service '${name}' already exists!\}`);
        return false;
    }

    let templateDir: string;

    if (type === 'dockerDeployment' || type === 'deploy') {
        const templates = fs.readdirSync(`${templatesRootDir}/dockerDeployment`);

        if (!templates.includes(template)) {
            notATemplate(template, templates);
            return false;
        }

        templateDir = `${templatesRootDir}/dockerDeployment/${template}`;
    } else if (type === 'dockerImage' || type === 'image') {
        const templates = fs.readdirSync(`${templatesRootDir}/dockerImage`);

        if (!templates.includes(template)) {
            notATemplate(template, templates);
            return false;
        }

        templateDir = `${templatesRootDir}/dockerImage/${template}`;
    } else if (type === 'pureHelm' || type === 'helm') {
        const templates = fs.readdirSync(`${templatesRootDir}/pureHelm`);

        if (!templates.includes(template)) {
            notATemplate(template, templates);
            return false;
        }

        templateDir = `${templatesRootDir}/pureHelm/${template}`;
    } else if (type === 'buildContainer' || type === 'build') {
        const templates = fs.readdirSync(`${templatesRootDir}/buildContainer`);

        if (!templates.includes(template)) {
            notATemplate(template, templates);
            return false;
        }

        templateDir = `${templatesRootDir}/buildContainer/${template}`;
    } else {
        context.cliMessage(`Unimplemented template type ${type}`);
        return false;
    }

    const sourceDir = inheritedSource || `source/${name}`;
    const templateVals = {
        service: name,
        project,
        repo: remote,
        author: user.name,
        source: sourceDir,
    };
    let prettyTemplateDir = path.normalize(templateDir);

    if (process.env.HOME) {
        const prettyTemplateRelative = path.relative(process.env.HOME, prettyTemplateDir);

        if (!prettyTemplateRelative.startsWith('..')) {
            prettyTemplateDir = `~/${prettyTemplateRelative}`;
        }
    }

    // Run dependencies
    if (fs.existsSync(`${templateDir}/deps.hjson`)) {
        const depsFile = fs.readFileSync(`${templateDir}/deps.hjson`, 'utf8');
        const deps: ServiceDep[] = Hjson.rt.parse(processTemplateS(depsFile, templateVals));

        for (const dep of deps) {
            const result = await addSingleService({
                templatesRootDir, rawConfig, config, context, user, remote, project,
                type: dep.type,
                template: dep.template,
                name: name + dep.suffix,

                inheritedSource: dep.inheritSource ? sourceDir : undefined,
            });

            if (result === false) {
                return false;
            }
        }
    }

    // Add stuff into firstmate.hjson file
    if (fs.existsSync(`${templateDir}/service.hjson`)) {
        const serviceFile = fs.readFileSync(`${templateDir}/service.hjson`, 'utf8');
        const service = Hjson.rt.parse(processTemplateS(serviceFile, templateVals));

        if (typeof rawConfig.services !== 'object') {
            rawConfig.services = {};
        }

        rawConfig.services[name] = service;
    }

    // Copy source files if not inheriting source
    if (fs.existsSync(`${templateDir}/source`) && !inheritedSource) {
        mkdirp.sync('source');

        console.log(a`\{ld Copying from ${prettyTemplateDir}/source to \}\{m ${sourceDir}\}`);
        await new Promise((resolve, reject) => {
            ncp(`${templateDir}/source`, sourceDir, {
                dereference: true,
                transform: (read: any, write: any) => {
                    const proc = new TemplateProcessor({vars: templateVals});

                    read.pipe(proc);
                    proc.pipe(write);
                },
            }, (err?: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    // Copy service files if not inheriting source
    if (fs.existsSync(`${templateDir}/service`)) {
        mkdirp.sync('fm');

        console.log(a`\{ld Copying from ${prettyTemplateDir}/service to \}\{m fm/${name}\}`);
        await new Promise((resolve, reject) => {
            ncp(`${templateDir}/service`, `fm/${name}`, {
                dereference: true,
                transform: (read: any, write: any) => {
                    const proc = new TemplateProcessor({vars: templateVals});

                    read.pipe(proc);
                    proc.pipe(write);
                },
            }, (err?: any) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    return true;
}
