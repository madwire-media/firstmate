// tslint:disable:max-classes-per-file

// Enable source maps
import 'source-map-support/register';

const isSerde = Symbol('isSerde?');
const serdeParsers = Symbol('serdeParsers');
const serdeParser = Symbol('serde.parser');
serde.parser = serdeParser;
serde.internal = Symbol('serde.internal');

// Type to store parser functions
type Parsers<T> = {
    [K in keyof T]?: (input: any, context: SerdeContext) => T[K];
};

// Basic JSON-serializable types
export type SerdeType = boolean | number | string | null | ISerdeArray | ISerdeObject;
interface ISerdeArray extends Array<SerdeType> {}
interface ISerdeObject {[key: string]: SerdeType; }

type SerdeTypeName =
    | 'array'
    | 'boolean'
    | 'null'
    | 'number'
    | 'object'
    | 'string';

export type SerdeMapFunction<T extends SerdeType, K extends keyof T, O extends T> =
    (key: K, value: SerdeTester<T[K] extends SerdeType ? T[K] : never>) => SerdeTester<O>;

export class SerdeTester<T extends SerdeType = SerdeType> {
    public value: T;
    public context: SerdeContext;

    constructor(input: T, context: SerdeContext) {
        this.value = input;
        this.context = context;
    }

    public asArray(): SerdeTester<Extract<T, ISerdeArray>> {
        if (serde.is.array(this.value)) {
            return this as any;
        } else {
            return this.context.typeError(
                `input (${serde.getType(this.value)}) is not an array`,
            );
        }
    }
    public asBoolean(): SerdeTester<Extract<T, boolean>> {
        if (serde.is.boolean(this.value)) {
            return this as any;
        } else {
            return this.context.typeError(
                `input (${serde.getType(this.value)}) is not a boolean`,
            );
        }
    }
    public asNull(): SerdeTester<Extract<T, null>> {
        if (serde.is.null(this.value)) {
            return this as any;
        } else {
            return this.context.typeError(
                `input (${serde.getType(this.value)}) is not null`,
            );
        }
    }
    public asNumber(): SerdeTester<Extract<T, number>> {
        if (serde.is.number(this.value)) {
            return this as any;
        } else {
            return this.context.typeError(
                `input (${serde.getType(this.value)}) is not a number`,
            );
        }
    }
    public asObject(): SerdeTester<Extract<T, ISerdeObject>> {
        if (serde.is.object(this.value)) {
            return this as any;
        } else {
            return this.context.typeError(
                `input (${serde.getType(this.value)}) is not an object`,
            );
        }
    }
    public asString(): SerdeTester<Extract<T, string>> {
        if (serde.is.string(this.value)) {
            return this as any;
        } else {
            return this.context.typeError(
                `input (${serde.getType(this.value)}) is not an object`,
            );
        }
    }

    public map<
        P extends SerdeMapFunction<T, T extends ISerdeArray ? Extract<keyof T, number> : keyof T, any>
    >(
        this: T extends ISerdeArray | ISerdeObject ? SerdeTester<T> : never,
        predicate: P,
    ): SerdeTester<
        T extends ISerdeArray ?
            ReturnType<P> extends SerdeTester<infer O> ? O[] : never :
        T extends ISerdeObject ?
            {
                [K in keyof T]: ReturnType<P> extends SerdeTester<infer O> ? O[] : never
            } :
        never
    > {
        if (this.value instanceof Array) {
            for (const keyString in this.value) {
                const key = +keyString;
                const tester = (this as SerdeTester<any>).context.sub(key).test(this.value[key]);
                predicate(key as any, tester as any);
            }
        } else {
            for (const key in this.value) {
                const tester = (this as SerdeTester<any>).context.sub(key).test(this.value[key]);
                predicate(key as any, tester as any);
            }
        }

        return this as any;
    }

    public getProp<
        K extends (T extends ISerdeArray ? Extract<keyof T, number> : keyof T)
    >(
        this: T extends ISerdeArray | ISerdeObject ? SerdeTester<T> : never,
        key: K,
    ): SerdeTester<
        T extends ISerdeArray ?
            K extends Extract<keyof T, number> ? T[K] : never :
        T extends ISerdeObject ?
            T[K] :
        never
    > {
        if (!(key in this.value) || this.value[key as any] === undefined) {
            return (this as SerdeTester<any>).context.typeError(
                `property ${typeof key === 'string' ? `'${key}'` : key} does not exist`,
            );
        } else {
            return new SerdeTester(
                this.value[key as any],
                (this as SerdeTester<any>).context.sub(key),
            );
        }
    }

}

// Class to keep track of parsing progress
export class SerdeContext {
    private readonly path: (string | number)[];

    constructor(path?: (string | number)[]) {
        this.path = path || [];
    }

    public parse<
        C extends {new (...args: any[]): any},
    >(input: SerdeType, type: C): C extends {new (...args: any[]): infer T} ? T : never {
        if ((type as any)[isSerde] === true) {
            return new type(input, this, isSerde);
        } else {
            throw new TypeError(`Class '${type.name}' does not implement @serde`);
        }
    }

    public sub(subpath: string | number): SerdeContext {
        return new SerdeContext(this.path.concat([subpath]));
    }

    public test<T extends SerdeType>(input: T): SerdeTester<T> {
        return new SerdeTester(input, this);
    }

    // public map<
    //     F extends (prop: SerdeType, context: SerdeContext) => any,
    // >(input: ISerdeArray, func: F):
    //     F extends (prop: SerdeType, context: SerdeContext) => infer O ? O[] : never;

    // public map<
    //     I extends ISerdeObject,
    //     F extends (prop: SerdeType, context: SerdeContext) => any,
    // >(input: ISerdeObject, func: F):
    //     F extends (prop: SerdeType, context: SerdeContext) => infer O ? {[K in keyof I]: O} : never;

    // public map<
    //     I extends ISerdeObject | ISerdeArray,
    //     O,
    //     F extends (prop: SerdeType, context: SerdeContext) => O,
    // >(input: I, func: F) {
    //     if (input instanceof Array) {
    //         const output = [];

    //         for (const iAsString in input) {
    //             const i = +iAsString;
    //             output[i] = func(input[i], this.sub(i));
    //         }

    //         return output;
    //     } else {
    //         const output: {[K in keyof I]: O} = {} as any;

    //         for (const key in input) {
    //             output[key] = func((input as ISerdeObject)[key]!, this.sub(key));
    //         }

    //         return output;
    //     }
    // }

    public typeError(message: string): never {
        throw new TypeError(`serde type error at ${this.getPath()}: ${message}`);
    }
    public error(message: string): never {
        throw new Error(`serde error at ${this.getPath()}: ${message}`);
    }

    private getPath() {
        let pathStr = '';

        for (let frag of this.path) {
            frag = this.cleanFrag(frag);

            if (typeof frag === 'number') {
                pathStr += `[${frag}]`;
            } else if (/[a-z$_][a-z0-9]*/i.test(frag)) {
                pathStr += `.${frag}`;
            } else {
                pathStr += `[${JSON.stringify(frag)}]`;
            }
        }

        return pathStr;
    }
    private cleanFrag(frag: string | number): string | number {
        if (typeof frag === 'number' && frag % 1 !== 0) {
            return frag.toString();
        } else {
            return frag;
        }
    }
}

// Class to extend so that you can implement your own serde parser
export abstract class CustomSerde<I = SerdeType> {
    public static [isSerde] = true;

    constructor(value: I, context: SerdeContext = new SerdeContext()) {
        this[serdeParser](value, context);
    }

    protected abstract [serdeParser](value: I, context: SerdeContext): void;
}

// Class to extend so that your input value is strictly-typed
export abstract class StrictSerde<I> {
    public static [serdeParsers]: Parsers<any>;
    public static [isSerde] = true;

    // A useless property to tell TypeScript that StrictSerde classes are
    // different than any normal class, and that StrictSerde<A> classes are
    // different than StrictSerde<B> classes (in the same way A and B differ)
    private [isSerde]: I;

    constructor(value: I, context: SerdeContext = new SerdeContext()) {
        if (value === undefined) {
            return;
        }

        for (const key in (this.constructor as any)[serdeParsers]) {
            const parser = (this.constructor as any)[serdeParsers][key];

            if (parser !== undefined) {
                (this as any)[key] = parser.call(this, value, context.sub(key));
            }
        }
    }
}

// Class Decorator - extend class with serde functionality
export function serde<T extends {new (...args: any[]): {}}>(constructor: T) {
    const ExtendedClass = (() => class extends constructor {
        public static [serdeParsers]: Parsers<T>;
        public static [isSerde] = true;

        constructor(...args: any[]) {
            if (args[2] === isSerde) {
                super();
                const value = args[0];
                const context = args[1] || new SerdeContext();

                for (const key in ExtendedClass[serdeParsers]) {
                    const parser = ExtendedClass[serdeParsers][key];

                    if (parser !== undefined) {
                        (this as any)[key] = parser.call(this, value, context.sub(key));
                    }
                }
            } else {
                super(...args);
            }
        }
    })();

    return ExtendedClass;
}

// Property Decorator - implement parser for property
serde.from = {
    value<
        T extends {},
        K extends keyof T & string,
        F = (
            input: T extends StrictSerde<infer I> ? I : SerdeType,
            context: SerdeContext,
        ) => T[K]
    >(parser: F) {
        return (target: T, key: K) => {
            const constructor = target.constructor;

            if (!(serdeParsers in constructor)) {
                (constructor as any)[serdeParsers] = {};
            }
            (constructor as any)[serdeParsers][key] = parser;
        };
    },
    prop<
        T extends {},
        K extends keyof T & string,
        F = (
            input: T extends StrictSerde<infer I> ? (K extends keyof I ? I[K] : never) : SerdeType,
            context: SerdeContext,
        ) => T[K]
    >(parser: F) {
        return (target: T, key: K) => {
            const constructor = target.constructor;

            if (!(serdeParsers in constructor)) {
                (constructor as any)[serdeParsers] = {};
            }
            (constructor as any)[serdeParsers][key] = (i: SerdeType, c: SerdeContext) => {
                const prop = c.test(i).asObject().getProp(key);
                return (parser as any)(prop.value, prop.context);
            };
        };
    },
};

// Property Decorator - use class parser for property
serde.infer = {
    prop<
        T extends {},
        C extends {new (...args: any[]): T[K]},
        K extends keyof T & string,
    >(cls: C) {
        return (target: T, key: K) => {
            const constructor = target.constructor;

            if (!(serdeParsers in constructor)) {
                (constructor as any)[serdeParsers] = {};
            }
            (constructor as any)[serdeParsers][key] = (
                input: T extends StrictSerde<infer I> ? I : SerdeType,
                context: SerdeContext,
            ) => context.parse(
                context.test(input).asObject().value[key],
                cls,
            );
        };
    },
};

// Runtime serde parsing entry-point
serde.parse = <
    C extends {new (...args: any[]): any},
>(input: SerdeType, type: C): C extends {new (...args: any[]): infer T} ? T : never => {
    if ((type as any)[isSerde] === true) {
        return new type(input, new SerdeContext(), isSerde);
    } else {
        throw new TypeError(`Class '${type.name}' does not implement @serde`);
    }
};

// Generic type helpers
serde.is = {
    array: (input: any): input is ISerdeArray => (
        input instanceof Array
    ),
    boolean: (input: any): input is boolean => (
        typeof input === 'boolean'
    ),
    null: (input: any): input is null => (
        input === null
    ),
    number: (input: any): input is number => (
        typeof input === 'number'
    ),
    object: (input: any): input is ISerdeObject => (
        typeof input === 'object' &&
        input !== null &&
        !(input instanceof Array)
    ),
    string: (input: any): input is string => (
        typeof input === 'string'
    ),
};

serde.getType = (input: SerdeType): SerdeTypeName | 'other' => {
    if (typeof input === 'boolean') {
        return 'boolean';
    } else if (typeof input === 'number') {
        return 'number';
    } else if (typeof input === 'string') {
        return 'string';
    } else if (typeof input === 'object') {
        if (input === null) {
            return 'null';
        } else if (input instanceof Array) {
            return 'array';
        } else {
            return 'object';
        }
    } else {
        return 'other';
    }
};

serde.getTypeStrict = (input: SerdeType): SerdeTypeName => {
    const type = serde.getType(input);

    if (type === 'other') {
        throw new TypeError('input is not a SerdeType');
    }

    return type;
};
