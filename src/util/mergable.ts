export const mergedContents = Symbol('mergedContents');

export type Merged<T extends object> = T & {
    [mergedContents]: T[],
};

const isOnlyObject = <T>(input: T): input is Exclude<T, any[] | boolean | string | number | null | undefined> =>
    typeof input === 'object' && input !== null && !(input instanceof Array);

const unsupportedOperation = (op: string) => () => {throw new TypeError(`unsupported operation: ${op}`); };

export function merge<
    T extends object
>(
    // tslint:disable-next-line:trailing-comma
    ...items: (Exclude<T, any[]> | Exclude<T, any[]>[])[]
): Merged<Exclude<T, any[]>> {
    const contents: Exclude<T, any[]>[] = [];

    for (const item of items) {
        if (item instanceof Array) {
            for (const subItem of item) {
                if (isOnlyObject(subItem)) {
                    contents.push(subItem);
                } else if (subItem === null && contents.length === 0) {
                    // Null shouldn't have been an input in the first place
                    return null!;
                } else {
                    break;
                }
            }
        } else if (mergedContents in item) {
            for (const subItem of (item as Merged<typeof item>)[mergedContents]) {
                if (isOnlyObject(subItem)) {
                    contents.push(subItem);
                } else if (subItem === null && contents.length === 0) {
                    // Null shouldn't have been an input in the first place
                    return null!;
                } else {
                    break;
                }
            }
        } else if (isOnlyObject(item)) {
            contents.push(item);
        } else if (item === null && contents.length === 0) {
            // Null shouldn't have been an input in the first place
            return null!;
        } else {
            break;
        }
    }

    if (contents.length === 0 && items.length > 0) {
        throw new TypeError('no object(s) given as first parameter(s)');
    }

    return new Proxy({contents}, {
        apply: unsupportedOperation('apply'),
        construct: unsupportedOperation('construct'),
        defineProperty(target, property, descriptor) {
            return Reflect.defineProperty(target.contents[0], property, descriptor);
        },
        deleteProperty: unsupportedOperation('deleteProperty'),
        get(target, property, receiver) {
            if (property === mergedContents) {
                return target.contents;
            }

            if (property === '__COMMENTS__') {
                return undefined;
            }

            const subContents: object[] = [];

            for (const item of target.contents) {
                if (property in item) {
                    const prop = Reflect.get(item, property, receiver);

                    if (isOnlyObject(prop)) {
                        subContents.push(prop);
                    } else if (subContents.length > 0) {
                        return merge(...subContents);
                    } else {
                        return prop;
                    }
                }
            }

            if (subContents.length > 0) {
                return merge(...subContents);
            } else {
                return undefined;
            }
        },
        getOwnPropertyDescriptor(target, property) {
            if (property === '__COMMENTS__') {
                return undefined;
            }

            for (const item of target.contents) {
                if (property in item) {
                    return Object.getOwnPropertyDescriptor(item, property);
                }
            }

            return undefined;
        },
        getPrototypeOf: () => ({}),
        has: (target, property) =>
            property !== '__COMMENTS__' &&
            target.contents.some((item) => property in item),
        isExtensible: () => true,
        ownKeys(target) {
            const output = new Set<string | number | symbol>();

            for (const item of target.contents) {
                for (const key of Reflect.ownKeys(item)) {
                    if (key !== '__COMMENTS__') {
                        output.add(key);
                    }
                }
            }

            return Array.from(output);
        },
        preventExtensions: unsupportedOperation('preventExtensions'),
        set(target, property, value, receiver) {
            if (property === '__COMMENTS__') {
                return false;
            }

            for (const item of target.contents) {
                if (property in item) {
                    return Reflect.set(item, property, value, receiver);
                }
            }

            if (target.contents.length === 0) {
                return false;
            } else {
                return Reflect.set(target.contents[0], property, value, receiver);
            }
        },
        setPrototypeOf: unsupportedOperation('setPrototypeOf'),
    }) as unknown as Merged<Exclude<T, any[]>>;
}
