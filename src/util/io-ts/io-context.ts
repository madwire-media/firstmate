import * as t from 'io-ts';

export class IoContext extends Array<t.ContextEntry> implements t.Context {
    public static default(type: t.Decoder<any, any>): IoContext {
        return new IoContext({key: '', type});
    }

    public static createEntry(key: string, type: t.Decoder<any, any>): t.ContextEntry {
        return {key, type};
    }

    public static from(input: t.Context | IoContext | t.ContextEntry[]): IoContext {
        return new IoContext(...input);
    }

    public sub(key: string, type: t.Decoder<any, any>): IoContext;
    public sub(entry: t.ContextEntry): IoContext;
    public sub(key: string | t.ContextEntry, type?: t.Decoder<any, any>): IoContext {
        let entry: t.ContextEntry;

        if (typeof key === 'string') {
            if (type === undefined) {
                throw new TypeError('type is undefined');
            }

            entry = {key, type};
        } else {
            entry = key;
        }

        return new IoContext(...this, entry);
    }

    public intoValidationError(value: t.mixed): t.ValidationError {
        return {value, context: this};
    }
}
