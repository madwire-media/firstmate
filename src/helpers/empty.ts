export function empty(input: object | any[]) {
    if (input instanceof Array) {
        return input.length === 0;
    } else {
        return Object.keys(input).length === 0;
    }
}
