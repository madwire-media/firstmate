import * as t from 'io-ts';
import { inspect } from 'util';

const jsObjectKeyRegex = /^[a-zA-Z$_][a-zA-Z0-9$_]*$/;

function processErrors(errors: t.Errors): string[] {
    const messages: string[] = [];

    for (const error of errors) {
        let path = '';
        let ignoreNext = true;
        let nextIsNumerical = false;

        for (const entry of error.context) {
            if (ignoreNext) {
                ignoreNext = false;
            } else {
                if ('mapKey' in entry) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const { isKey, mapKey } = entry as any;

                    if (isKey) {
                        path += `[${inspect(mapKey)}](key)`;
                    } else {
                        path += `[${inspect(mapKey)}]`;
                    }
                } else if (nextIsNumerical && !Number.isNaN(+entry.key)) {
                    path += `[${entry.key}]`;
                } else if (jsObjectKeyRegex.test(entry.key)) {
                    path += `.${entry.key}`;
                } else {
                    path += `[${JSON.stringify(entry.key)}]`;
                }
            }

            if (
                entry.type instanceof t.UnionType
                || entry.type instanceof t.IntersectionType
            ) {
                ignoreNext = true;
            }

            nextIsNumerical = entry.actual instanceof Array;
        }

        if (error.context.length > 0) {
            const lastContext = error.context[error.context.length - 1];

            // , got ${inspect(lastContext.actual, { depth: 0, maxArrayLength: 1 })}

            if (error.message !== undefined) {
                messages.push(`data at ${path}: invalid ${lastContext.type.name} (${error.message}), got ${inspect(lastContext.actual, { depth: 0, maxArrayLength: 1 })}`);
            } else {
                messages.push(`data at ${path}: invalid ${lastContext.type.name}, got ${inspect(lastContext.actual, { depth: 0, maxArrayLength: 1 })}`);
            }
        } else {
            if (error.message !== undefined) {
                messages.push(`(no error context given: ${error.message})`);
            } else {
                messages.push('(no error message given)');
            }
        }
    }

    return messages;
}

export class ValidationError extends Error {
    public readonly rawErrors: t.Errors;

    public readonly errors: string[];

    constructor(message: string, errors: t.Errors) {
        const processed = processErrors(errors);

        let newMessage = message;

        for (const line of processed) {
            newMessage += `\n    ${line}`;
        }

        if (processed.length > 0) {
            newMessage += '\n';
        }

        super(newMessage);

        this.rawErrors = errors;
        this.errors = processed;
    }
}
