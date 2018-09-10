import * as EventEmitter from 'events';
import * as os from 'os';
import * as tty from 'tty';

export const which = os.platform() === 'win32' ? 'where' : 'which';
export let a: {
    [cmd: string]: string,
} & ((strings?: TemplateStringsArray, ...keys: any[]) => string);
export const colors = tty.isatty(0);

// Use colors if a tty, otherwise use a shim instead
if (colors) {
    // tslint:disable-next-line:no-var-requires
    a = require('short-ansi')();
} else {
    a = new Proxy((strings?: TemplateStringsArray, ...keys: any[]): string => {
        let output = '';

        if (strings !== undefined) {
            const strs = strings.raw;

            for (let str of strs) {
                str = str.replace(/\\{[a-z0-9_,]* ?|\\}/g, '');

                output += unescape(str);

                if (keys !== undefined && keys.length > 0) {
                    output += keys.shift();
                }
            }
        }

        return output;
    }, {
        get: () => '',
        set: () => true,
    }) as {
        [cmd: string]: string,
    } & ((strings?: TemplateStringsArray, ...keys: string[]) => string);
}

export function fmt(arg: string): string {
    if (/[ '"`(){}$*#\\]/.test(arg)) {
        return JSON.stringify(arg);
    } else {
        return arg;
    }
}

export const events = new EventEmitter();
let interruptTriggered = false;
export function interrupt() {
    console.log('Interrupt!');

    if (interruptTriggered) {
        return;
    }
    interruptTriggered = true;

    events.emit('interrupt');
}
process.on('SIGINT', interrupt);
