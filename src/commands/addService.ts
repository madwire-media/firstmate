import * as fs from 'fs-extra';
import * as path from 'path';

import * as Hjson from 'hjson';
import leven = require('leven');
import { ncp } from 'ncp';

import { RawConfig, rawProject } from '../config';
import { a } from '../helpers/cli';
import { loadConfig, loadConfigRaw, loadUser, saveConfig } from '../helpers/config';
import { getGitOrigin } from '../helpers/git';
import { User } from '../user';
import { processTemplate, TemplateProcessor } from '../util/template';

interface ServiceDep {
    suffix: string;
    type: string;
    template: string;
    inheritSource?: boolean;
}

function notATemplate(template: string, templates: string[]) {
    console.log(a`\{lr Template \{w '${template}'\} is not a valid template\}`);

    const similar: string[] = [];

    for (const t of templates) {
        const distance = leven(t, template);

        if (distance <= 3) {
            similar.push(t);
        }
    }

    if (similar.length > 0) {
        let msg = a`\{b Did you mean `;

        for (let i = 0; i < similar.length; i++) {
            if (i === similar.length - 1) {
                if (i > 1) {
                    msg += ', ';
                } else {
                    msg += ' ';
                }

                msg += 'or ';
            } else if (i > 0) {
                msg += ', ';
            }

            msg += a`\{b \{lw '${similar[i]}'\}`;
        }

        msg += '?';

        console.log(msg);
    }

    console.log(a`\{ld (You can run \{w fm templates\} to list all templates)\}`);
}

export async function addService(context: any, service: string, type: string, template: string, noSource: boolean) {
    const raw = loadConfigRaw(context);
    if (raw === undefined) {
        return false;
    }
    const [rawConfig, configFile, configIsHjson] = raw;

    const configValid = rawProject.decode(rawConfig);
    if (configValid.isLeft()) {
        return false;
    }
    const config = configValid.value;

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
        templatesRootDir, config, user, type, template, context,
        name: service, remote, project, noSource,
    });
    if (result === false) {
        return false;
    }

    return saveConfig([rawConfig, configFile, configIsHjson], context);
}

async function addSingleService({
    templatesRootDir, config, type, template, context, name,
    inheritedSource, user, remote, project, noSource,
}: {
    templatesRootDir: string, config: RawConfig,
    type: string, template: string, context: any, name: string,
    inheritedSource?: string, user: User, remote: string, project: string,
    noSource: boolean,
}) {
    if (name in config) {
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
        const deps: ServiceDep[] = Hjson.rt.parse(processTemplate(depsFile, templateVals));

        for (const dep of deps) {
            const result = await addSingleService({
                templatesRootDir, config, context, user, remote, project,
                type: dep.type,
                template: dep.template,
                name: name + dep.suffix,
                noSource,

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
        const service = Hjson.rt.parse(processTemplate(serviceFile, templateVals));

        config.services[name] = service;
    }

    // Copy source files if not inheriting source
    if (fs.existsSync(`${templateDir}/source`) && !inheritedSource && !noSource) {
        fs.mkdirpSync('source');

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
        fs.mkdirpSync('fm');

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
