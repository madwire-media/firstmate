#!/usr/bin/env node
import 'source-map-support/register';

import * as fs from 'fs';

import { ncp } from 'ncp';

import { a, cleanup } from './helpers/cli';
import { runService } from './helpers/service';

import * as semver from 'semver';
import { addService } from './commands/addService';
import { copyFilesCmd, copyFilesCmdReqs } from './commands/copyFiles';
import { dryDev } from './commands/dryDev';
import { newProject } from './commands/newProject';
import { publishProd, publishProdConfig, publishProdReqs } from './commands/publishProd';
import { purgeDev, purgeDevReqs } from './commands/purgeDev';
import { purgeProd, purgeProdReqs } from './commands/purgeProd';
import { purgeStage, purgeStageReqs } from './commands/purgeStage';
import { runDev, runDevReqs } from './commands/runDev';
import { runProd, runProdReqs } from './commands/runProd';
import { runStage, runStageReqs } from './commands/runStage';
import { setVersion, setVersionConfig, setVersionReqs } from './commands/setVersion';
import { templates } from './commands/templates';
import { validate } from './commands/validate';
import { uncopyFiles } from './helpers/mount';

(ncp as any).limit = 32;

process.on('unhandledRejection', (err) => console.error(err));

const styleHooks = {
    usagePrefix: (s: string) => a`\{lw,u ${s.slice(0, 6)}\} \{lm,i ${s.slice(7)}\}`,
    usageCommandPlaceholder: (s: string) => a`\{m,i ${s}\}`,
    usagePositionals: (s: string) =>
        s
            .replace(/\[.+?\]/g, a`\{y,i $&\}`)
            .replace(/<.+?>/g, a`\{g,i $&\}`),
    usageArgsPlaceholder: (s: string) => a`\{g,i ${s}\}`,
    usageOptionsPlaceholder: (s: string) => a`\{y,i ${s}\}`,

    group: (s: string) => a`\{lw,u ${s}\}`,
    hints: (s: string) => a`\{ld ${s}\}`,
    // desc: (s: string) => a`\{c ${s}\}`,
    flags: (s: string, type: any) => {
        if (type.datatype === 'command') {
            const parts = s.match(/^([^\s]+)(?:(\s)(.+))?$/)!;
            let ret = a`\{m ${parts[1]}\}`;

            if (parts[3]) {
                ret += parts[2];
                ret += parts[3]
                    .replace(/\[.+?\]/g, a`\{y $&\}`)
                    .replace(/<.+?>/g, a`\{g $&\}`);
            }

            return ret;
        } else {
            return type.isRequired ?
                a`\{g ${s}\}` :
                a`\{y ${s}\}`;
        }
    },

    groupError: (s: string) => a`\{lr,u,t ${s}\}`,
    flagsError: (s: string) => a`\{lr,t ${s}\}`,
    descError: (s: string) => a`\{ly ${s}\}`,
    hintsError: (s: string) => a`\{lr ${s}\}`,
    messages: (s: string) => a`\{lr,t ${s}\}`,
};
const logo = a`\{lw ${fs.readFileSync(`${__dirname}/../logo.txt`, 'utf8')}\}`;
const templateTypes = [
    'dockerDeployment', 'deploy',
    'dockerImage', 'image',
    'buildContainer', 'build',
    'pureHelm', 'helm',
];

function helpOnError(self: any, context: any) {
    if ((context.helpRequested || context.messages.length) && !context.output) {
        context.addDeferredHelp(self.api.initHelpBuffer());
    }
}

export let helmCommand = 'helm';

// tslint:disable-next-line:no-var-requires
const sywac = require('sywac');

export enum VersionChangeKind {
    major,
    minor,
    patch,
    prerelease,
    tag,
    value,
}
export class VersionChange<K extends VersionChangeKind> {
    public kind: K;
    public value: K extends VersionChangeKind.tag | VersionChangeKind.value ? string : undefined;

    constructor(
        kind: K,
        value: K extends VersionChangeKind.tag | VersionChangeKind.value ? string : undefined,
    ) {
        this.kind = kind;
        this.value = value;
    }
}
class TypeVersion extends require('sywac/types/string') {
    constructor(opts: any) {
        super(opts);
    }

    get datatype() {
        return 'version';
    }

    public getValue(context: any) {
        const v: string | undefined | null = context.lookupValue(this.id);

        if (typeof v === 'undefined' || v === null) {
            return undefined;
        }

        let change;

        if (
            v === 'major' ||
            v === 'minor' ||
            v === 'patch' ||
            v === 'prerelease'
        ) {
            change = new VersionChange(VersionChangeKind[v], undefined);
        } else if (v.startsWith('_')) {
            change = new VersionChange(VersionChangeKind.tag, v);
        } else if (semver.valid(v)) {
            change = new VersionChange(VersionChangeKind.value, v);
        } else {
            return undefined;
        }

        return change;
    }

    public setValue(context: any, value: any) {
        context.assignValue(this.id, typeof value === 'boolean' ? undefined : value);
    }

    public validateValue(value: any) {
        return typeof value === 'string' && (
            ['major', 'minor', 'patch', 'prerelease'].includes(value) ||
            value.startsWith('_')
        );
    }

    public buildInvalidMessage(context: any, msgAndArgs: any) {
        super.buildInvalidMessage(context, msgAndArgs);
        msgAndArgs.msg += "Please specify 'major', 'minor', 'patch', 'prerelease', or '_[tag]'";
    }
}
sywac.registerFactory('version', (opts: any) => new TypeVersion(opts));

function procCommonArgv(argv: {[arg: string]: any}) {
    helmCommand = argv['helm-exe'] || helmCommand;
}

sywac
    .configure({name: 'fm'})
    .style(styleHooks)
    .preface(logo)
    .string('--helm-exe', {
        desc: 'Sets the helm executable',
    })
    .command('new <projectName>', {
        desc: 'Creates a new empty Firstmate project',
        paramsDesc: [
            'Name of new project',
        ],
        async run(argv: {[arg: string]: any}, context: any) {
            procCommonArgv(argv);

            await newProject(argv.projectName);
        },
    })
    .command('add <type:enum> <template> <service> [--no-source]', {
        desc: 'Add a new service to an existing project',
        params: [
            {
                choices: templateTypes,
            },
        ],
        paramsDesc: [
            'Type of service to create',
            'Name of new service',
        ],
        async run(argv: {[arg: string]: any}, context: any) {
            procCommonArgv(argv);

            const result = await addService(context, argv.service, argv.type, argv.template, argv['no-source']);

            if (result === false) {
                context.code++;
            }
        },
    })
    .command('templates [type]', {
        desc: 'List templates to install with `fm add`',
        params: [
            {
                choices: templateTypes,
            },
        ],
        paramsDesc: [
            'Filter templates by a specific type',
        ],
        async run(argv: {[arg: string]: any}, context: any) {
            procCommonArgv(argv);

            templates(argv.type);
        },
    })
    .command('copy-files <mode:enum> [service]', {
        desc: 'Temporarily copies files for a service',
        params: [
            {
                choices: ['dev', 'stage', 'prod'],
            },
        ],
        paramsDesc: [
            'Service to copy files for',
        ],
        async run(argv: {[arg: string]: any}, context: any) {
            procCommonArgv(argv);

            await runService(copyFilesCmd, copyFilesCmdReqs, undefined, context, argv, argv.service, {});
        },
    })
    .command('clean', {
        desc: 'Clean up any dangling files if Firstmate crashed',
        async run(argv: {[arg: string]: any}) {
            procCommonArgv(argv);

            await uncopyFiles();
        },
    })
    .command('run <mode:enum> [service] [debug] [--dry] [--tponly]', {
        desc: 'Run a service',
        hints: [
            '[docker] [helm] [telepresence]',
        ],
        params: [
            {
                choices: ['dev', 'stage', 'prod'],
            },
        ],
        paramsDesc: [
            'Environment to run in',
            'Service to run',
            'Container to debug (only in dev mode)',
            'Do a dry run?',
            'Run only telepresence?',
        ],
        async run(argv: {[arg: string]: any}, context: any) {
            procCommonArgv(argv);

            switch (argv.mode) {
                case 'dev':
                    const devService = argv.dry ? dryDev : runDev;
                    await runService(devService, runDevReqs, undefined, context, argv, argv.service, {});
                    break;

                case 'stage':
                    await runService(runStage, runStageReqs, undefined, context, argv, argv.service);
                    break;

                case 'prod':
                    await runService(runProd, runProdReqs, undefined, context, argv, argv.service);
                    break;

                default:
                    context.cliMessage(`Unimplemented run mode ${argv.mode}`);
                    break;
            }

            helpOnError(this, context);
        },
    })
    .command('publish <mode:enum> [service] [version:version]', {
        desc: "Publish a service's images and charts",
        hints: [
            '[docker] [helm]',
        ],
        params: [
            {
                choices: [/*'dev', 'stage',*/ 'prod'],
            },
        ],
        paramsDesc: [
            'Environment to publish for',
            'Service to publish',
            'Semver version change or tag to publish',
        ],
        async run(argv: {[arg: string]: any}, context: any) {
            procCommonArgv(argv);

            switch (argv.mode) {
                case 'prod':
                    await runService(publishProd, publishProdReqs, publishProdConfig, context, argv, argv.service);
                    break;

                default:
                    context.cliMessage(`Unimplemented publish mode ${argv.mode}`);
                    break;
            }

            helpOnError(this, context);
        },
    })
    .command('purge <mode:enum> <service>', {
        desc: "Delete all of a service's resources",
        hints: [
            '[helm]',
        ],
        params: [
            {
                choices: ['dev', 'stage', 'prod'],
            },
        ],
        paramsDesc: [
            'Environment to clean in',
            'Service to clean up',
        ],
        async run(argv: {[arg: string]: any}, context: any) {
            procCommonArgv(argv);

            switch (argv.mode) {
                case 'dev':
                    await runService(purgeDev, purgeDevReqs, undefined, context, argv, argv.service, {});
                    break;

                case 'stage':
                    await runService(purgeStage, purgeStageReqs, undefined, context, argv, argv.service);
                    break;

                case 'prod':
                    await runService(purgeProd, purgeProdReqs, undefined, context, argv, argv.service);
                    break;

                default:
                    context.cliMessage(`Unimplemented purge mode ${argv.mode}`);
                    break;
            }

            helpOnError(this, context);
        },
    })
    .command('debug <mode:enum> [service] <container>', {
        desc: 'Debug a container of a running service using Telepresence',
        hints: [
            '[telepresence]',
        ],
        params: [
            {
                choices: ['dev', 'stage', 'prod'],
            },
        ],
        paramsDesc: [
            'Environment to debug in',
            'Service to debug (looks at firstmate.json for default)',
            'Container to debug in service (only if service is a Docker Deployment)',
        ],
        async run(argv: {[arg: string]: any}, context: any) {
            procCommonArgv(argv);

            switch (argv.mode) {
                default:
                    context.cliMessage(`Unimplemented debug mode ${argv.mode}`);
                    break;
            }

            helpOnError(this, context);
        },
    })
    .command('set-version <mode:enum> <service> <version:version>', {
        desc: "Set or increment a service's version",
        hints: [
            '[docker] [helm]',
        ],
        params: [
            {
                choices: ['dev', 'stage', 'prod'],
            },
        ],
        paramsDesc: [
            'Environment to publish for',
            'Service to publish',
            'Semver version change or tag to publish',
        ],
        async run(argv: {[arg: string]: any}, context: any) {
            procCommonArgv(argv);

            await runService(setVersion, setVersionReqs, setVersionConfig, context, argv, argv.service, {});
        },
    })
    .command('validate [service]', {
        desc: "Validate one or all services' configurations",
        paramsDesc: [
            'Service to validate (validates all by default)',
        ],
        async run(argv: {[arg: string]: any}, context: any) {
            procCommonArgv(argv);

            if (!await validate(argv, argv.service)) {
                context.code++;
            }
        },
    })
    .help('-h, --help')
    .version('-v, --version')
    .showHelpByDefault()
    .parseAndExit()
    .then(() => {
        cleanup();
    });
