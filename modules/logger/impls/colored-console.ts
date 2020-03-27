import Chalk from 'chalk';

import { Logger } from '..';
import {
    LogPartial,
    LogData,
    LogPath,
    LogBranch,
    LogSuggestions,
    LogCommand,
    LogModule,
    LogService,
    LogInput,
    LogEnvironment,
    LogError,
} from '../types';

type TextColorer = (text: string) => string;

/* eslint-disable @typescript-eslint/no-use-before-define */
function colorData(data: LogData, colorText?: TextColorer) {
    switch (data.type) {
        case 'partial': {
            return colorPartial(data, colorText);
        }

        case 'path': {
            return colorPath(data);
        }

        case 'branch': {
            return colorBranch(data);
        }

        case 'suggestions': {
            return colorSuggestions(data, colorText);
        }

        case 'command': {
            return colorCommand(data);
        }

        case 'module': {
            return colorModule(data);
        }

        case 'service': {
            return colorService(data);
        }

        case 'input': {
            return colorInput(data);
        }

        case 'environment': {
            return colorEnvironment(data);
        }

        case 'error': {
            return colorError(data);
        }
    }
}
/* eslint-enable @typescript-eslint/no-use-before-define */

function colorPartial(partial: LogPartial, colorText?: TextColorer) {
    let output = '';

    for (let i = 0; i < partial.strings.length; i += 1) {
        if (i > 0) {
            output += colorData(partial.data[i - 1], colorText);
        }

        if (colorText !== undefined) {
            output += colorText(partial.strings[i]);
        } else {
            output += partial.strings[i];
        }
    }

    return output;
}

function colorPath({ path }: LogPath) {
    return Chalk.green(path);
}

function colorBranch({ branch }: LogBranch) {
    return Chalk.magenta(branch);
}

function colorSuggestions(
    { question, suggestions }: LogSuggestions,
    colorText?: TextColorer,
) {
    let questionText;

    if (colorText !== undefined) {
        questionText = colorText(question);
    } else {
        questionText = question;
    }

    const textSuggestions = [];

    for (const suggestion of suggestions) {
        // Suggestions won't be colored by default
        textSuggestions.push(colorPartial(suggestion));
    }

    const suggestionsText = textSuggestions
        .join('\n')
        .replace(/\n(?!\n)/g, '    \n');

    return `${questionText}\n${suggestionsText}`;
}

function colorCommand(
    { command }: LogCommand,
) {
    return Chalk.blueBright(Chalk.underline(command));
}

function colorModule(
    { module }: LogModule,
) {
    return Chalk.bgBlack(Chalk.whiteBright(module));
}

function colorService(
    { service }: LogService,
) {
    // TODO: Find a better color for this?
    return Chalk.bgBlack(Chalk.whiteBright(service));
}

function colorInput(
    { input }: LogInput,
) {
    return Chalk.italic(input);
}

function colorEnvironment(
    { environment }: LogEnvironment,
) {
    return Chalk.cyan(environment);
}

function colorError(
    { error }: LogError,
) {
    return Chalk.redBright(Chalk.underline(error.message));
}

export class ColoredConsoleLogger implements Logger {
    public trace(strings: TemplateStringsArray, ...data: LogData[]): void {
        const log = colorPartial({
            type: 'partial',
            strings,
            data,
        });

        // eslint-disable-next-line no-console
        console.log(Chalk.dim(log));
    }

    public info(strings: TemplateStringsArray, ...data: LogData[]): void {
        const log = colorPartial({
            type: 'partial',
            strings,
            data,
        });

        // eslint-disable-next-line no-console
        console.log(log);
    }

    public success(strings: TemplateStringsArray, ...data: LogData[]): void {
        const log = colorPartial({
            type: 'partial',
            strings,
            data,
        }, Chalk.green);

        // eslint-disable-next-line no-console
        console.log(log);
    }

    public warn(strings: TemplateStringsArray, ...data: LogData[]): void {
        const log = colorPartial({
            type: 'partial',
            strings,
            data,
        }, Chalk.yellowBright);

        // eslint-disable-next-line no-console
        console.log(log);
    }

    public error(strings: TemplateStringsArray, ...data: LogData[]): void {
        const log = colorPartial({
            type: 'partial',
            strings,
            data,
        }, Chalk.redBright);

        // eslint-disable-next-line no-console
        console.log(log);
    }

    public question(): Promise<string> {
        throw new Error('unimplemented');
    }
}
