const requiresEscape = /[ '"`(){}$*#\\]/;


export function formatArgs(args: string[]): string {
    let command = '';

    for (const arg of args) {
        if (command.length > 0) {
            command += ' ';
        }

        // TODO: properly escape on Windows

        if (requiresEscape.test(arg)) {
            command += JSON.stringify(arg);
        } else {
            command += arg;
        }
    }

    return command;
}
