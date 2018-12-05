export const defaultContents = Symbol('mergedContents');

export type Merged<T extends object> = T & {
    [defaultContents]: {
        input: T,
        def: T,
    },
};

const isOnlyObject = <T>(input: T): input is Exclude<T, any[] | boolean | string | number | null | undefined> =>
    typeof input === 'object' && input !== null && !(input instanceof Array);

const unsupportedOperation = (op: string) => () => {throw new TypeError(`unsupported operation: ${op}`); };

export function setDefault<
    T extends object,
    D extends {[K in keyof T]?: T[K]}
>(input: T, def: D): Merged<Exclude<T, any[]>> {
    if (defaultContents in input) {
        def = Object.assign({}, def, (input as any)[defaultContents].def);
        input = (input as any)[defaultContents].input;
    }

    const contents = {
        input,
        def
    };

    return new Proxy({contents}, {
        apply: unsupportedOperation('apply'),
        construct: unsupportedOperation('construct'),
        defineProperty: unsupportedOperation('defineProperty'),
        deleteProperty: unsupportedOperation('deleteProperty'),
        get(target, property, receiver) {
            if (property === defaultContents) {
                return target.contents;
            }

            const {contents} = target;

            if (property in contents.input) {
                const inputProp = (contents.input as any)[property];

                if (isOnlyObject(inputProp)) {
                    if (property in contents.def && isOnlyObject((contents.def as any)[property])) {
                        return setDefault(inputProp, (contents.def as any)[property]);
                    } else {
                        return inputProp;
                    }
                } else {
                    return inputProp;
                }
            } else {
                return (target.contents.def as any)[property];
            }
        },
        getOwnPropertyDescriptor(target, property) {
            if (property in target.contents.input) {
                return Object.getOwnPropertyDescriptor(target.contents.input, property);
            } else {
                return Object.getOwnPropertyDescriptor(target.contents.def, property);
            }
        },
        getPrototypeOf: () => ({}),
        has: (target, property) =>
            property in target.contents.input ||
            property in target.contents.def,
        isExtensible: () => true,
        ownKeys(target) {
            const output = new Set<string | number | symbol>();

            for (const key of Reflect.ownKeys(target.contents.input)) {
                output.add(key);
            }
            for (const key of Reflect.ownKeys(target.contents.def)) {
                output.add(key);
            }

            return Array.from(output);
        },
        preventExtensions: unsupportedOperation('preventExtensions'),
        set(target, property, value, receiver) {
            return Reflect.set(target.contents.input, property, value, receiver);
        },
        setPrototypeOf: unsupportedOperation('setPrototypeOf'),
    }) as unknown as Merged<Exclude<T, any[]>>;
}
