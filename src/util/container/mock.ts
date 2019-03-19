import { inspect } from 'util';
import { Injectable } from './injectable';

export function emptyDeps<
    I extends Injectable<any>
>(): I extends Injectable<infer D> ? D : never {
    return new Proxy({} as {[key: string]: any}, {
        get(target, property, receiver) {
            if (!(property in target)) {
                target[property as string] = unusedDep(property.toString());
            }

            return Reflect.get(target, property, receiver);
        },
    }) as any;
}

export function unusedDep<D extends {}>(dependencyName: string): D {
    return new Proxy({} as D, {
        apply(target, thisArg, args) {
            const msg =
                `This dependency (${dependencyName}) is supposed to be unused ` +
                `(tried to apply with thisArg ${inspect(thisArg)} and args ${inspect(args)})`;

            if (fail !== undefined) {
                fail(msg);
            }

            throw new Error(msg);
        },
        construct(target, args) {
            const msg =
                `This dependency (${dependencyName}) is supposed to be unused ` +
                `(tried to construct with args ${inspect(args)})`;

            if (fail !== undefined) {
                fail(msg);
            }

            throw new Error(msg);
        },
        defineProperty(target, property, descriptor) {
            const msg =
                `This dependency (${dependencyName}) is supposed to be unused ` +
                `(tried to defineProperty [${inspect(property)}] with ${inspect(descriptor)})`;

            if (fail !== undefined) {
                fail(msg);
            }

            throw new Error(msg);
        },
        deleteProperty(target, property) {
            const msg =
                `This dependency (${dependencyName}) is supposed to be unused ` +
                `(tried to deleteProperty [${inspect(property)}])`;

            if (fail !== undefined) {
                fail(msg);
            }

            throw new Error(msg);
        },
        get(target, property) {
            const msg =
                `This dependency (${dependencyName}) is supposed to be unused ` +
                `(tried to get [${inspect(property)}])`;

            if (fail !== undefined) {
                fail(msg);
            }

            throw new Error(msg);
        },
        has(target, property) {
            const msg =
                `This dependency (${dependencyName}) is supposed to be unused ` +
                `(tried to has [${inspect(property)}])`;

            if (fail !== undefined) {
                fail(msg);
            }

            throw new Error(msg);
        },
        set(target, property, value) {
            const msg =
                `This dependency (${dependencyName}) is supposed to be unused ` +
                `(tried to set [${inspect(property)}] to ${inspect(value)})`;

            if (fail !== undefined) {
                fail(msg);
            }

            throw new Error(msg);
        },
    });
}

// export function unimplementedClass<I extends {}>(): I {
//     return new Proxy({} as {[key: string]: any}, {
//         get(target, property, receiver) {
//             if (!(property in target)) {
//                 target[property as string] = unimplementedFn(property.toString());
//             }

//             return Reflect.get(target, property, receiver);
//         },
//     }) as any;
// }
export function unimplementedFn(name: string = '?'): () => any {
    return () => unimplementedCall(name);
}
export function unimplementedCall(name: string = '?'): never {
    const msg = `This function (named '${name}') has yet to be mocked out`;

    if (fail !== undefined) {
        fail(msg);
    }

    throw new Error(msg);
}

export function cases<
    C extends [any[], any][],
>(cases: C):
    (...args: C extends [infer I, any][] ? I : never) =>
        C extends [any, infer R][] ? R : never
// tslint:disable-next-line: one-line
{
    return (...args) => {
        searchMatches: for (const [match, result] of cases) {
            if (args.length !== match.length) {
                continue;
            }

            const len = args.length;
            for (let i = 0; i < len; i++) {
                if (args[i] !== match[i]) {
                    continue searchMatches;
                }
            }

            return result;
        }

        const msg = `Unimplemented case ${inspect(args)}`;

        if (fail !== undefined) {
            fail(msg);
        }

        throw new Error(msg);
    };
}
