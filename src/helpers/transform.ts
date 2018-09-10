export function stringifyProps(input: {[key: string]: any}): {[key: string]: string} {
    const output: {[key: string]: string} = {};

    for (const key in input) {
        output[key] = String(input[key]);
    }

    return output;
}
