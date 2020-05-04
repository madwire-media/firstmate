import { Branded } from 'io-ts';

/** Use this when `typeof x === 'string'` doesn't work */
export function isString(input: unknown): input is Branded<string, unknown> | string {
    return typeof input === 'string';
}

export function isNumber(input: unknown): input is Branded<number, unknown> | number {
    return typeof input === 'number';
}
