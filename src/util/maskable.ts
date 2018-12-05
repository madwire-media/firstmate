const unsupportedOperation = (op: string) => () => {throw new TypeError(`unsupported operation: ${op}`); };

export function mask<
    T extends {[K in keyof M]?: any},
    M extends {[key: string]: any},
>(item: T, mask: M): {[K in Exclude<keyof T, keyof M>]: T[K]} {
    return new Proxy(item, {
        apply: unsupportedOperation('apply'),
        construct: unsupportedOperation('construct'),
        defineProperty(target, property, descriptor) {
            if (property in mask) {
                return false;
            } else {
                return Reflect.defineProperty(target, property, descriptor);
            }
        },
        deleteProperty(target, property) {
            if (property in mask) {
                return false;
            } else {
                return Reflect.deleteProperty(target, property);
            }
        },
        get(target, property, receiver) {
            if (property in mask) {
                return undefined;
            } else {
                return Reflect.get(target, property, receiver);
            }
        },
        getOwnPropertyDescriptor(target, property) {
            if (property in mask) {
                return undefined;
            } else {
                return Reflect.getOwnPropertyDescriptor(target, property);
            }
        },
        getPrototypeOf: (target) => Reflect.getPrototypeOf(target),
        has(target, property) {
            if (property in mask) {
                return false;
            } else {
                return Reflect.has(target, property);
            }
        },
        isExtensible: (target) => Reflect.isExtensible(target),
        ownKeys: (target) => Reflect.ownKeys(target).filter((k) => !(k in mask)),
        preventExtensions: (target) => Reflect.preventExtensions(target),
        set(target, property, value, receiver) {
            if (property in mask) {
                return false;
            } else {
                return Reflect.set(target, property, value, receiver);
            }
        },
        setPrototypeOf: (target, proto) => Reflect.setPrototypeOf(target, proto),
    });
}
