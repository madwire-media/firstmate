export function empty(input: any) {
    if (input instanceof Array) {
        return input.length === 0;
    } else if (typeof input === 'object') {
        return Object.keys(input).length === 0;
    } else {
        return input === undefined;
    }
}
