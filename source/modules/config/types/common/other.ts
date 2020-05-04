import * as t from 'io-ts';
import { isLeft } from 'fp-ts/lib/Either';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class SetType<C extends t.Any, A = any, O = A, I = unknown> extends t.Type<A, O, I> {
    public readonly _tag: 'SetType' = 'SetType';

    constructor(
        name: string,
        is: SetType<C, A, O, I>['is'],
        validate: SetType<C, A, O, I>['validate'],
        encode: SetType<C, A, O, I>['encode'],
        public readonly type: C,
    ) {
        super(name, is, validate, encode);
    }
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SetC<
    C extends t.Mixed
> extends SetType<
    C,
    Set<t.TypeOf<C>>,
    t.OutputOf<C>[],
    unknown
> {}

export const set = <C extends t.Mixed>(
    codec: C,
    name = `Set<${codec.name}>`,
): SetC<C> => new SetType(
    name,
    (u): u is Set<t.TypeOf<C>> => {
        if (!(u instanceof Set)) {
            return false;
        }

        for (const val of u) {
            if (!codec.is(val)) {
                return false;
            }
        }

        return true;
    },
    (inputSet, context) => {
        if (!(inputSet instanceof Array || inputSet instanceof Set)) {
            return t.failure(inputSet, context);
        }

        let outputSet;
        let i = 0;
        const errors: t.Errors = [];

        if (inputSet instanceof Array) {
            outputSet = new Set(inputSet);
        } else {
            outputSet = inputSet;
        }

        for (const val of inputSet) {
            const result = codec.validate(val, t.appendContext(context, String(i), codec, val));

            if (isLeft(result)) {
                errors.push(...result.left);
            } else {
                const typedVal = result.right;

                if (typedVal !== val) {
                    if (inputSet === outputSet) {
                        outputSet = new Set(inputSet);
                    }

                    outputSet.delete(val);
                    outputSet.add(typedVal);
                }
            }

            i += 1;
        }

        if (errors.length > 0) {
            return t.failures(errors);
        } else {
            return t.success(outputSet);
        }
    },
    (a) => Array.from(a).map(codec.encode),
    codec,
);

export class MapType<
    K extends t.Any,
    V extends t.Any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    A = any,
    O = A,
    I = unknown
> extends t.Type<A, O, I> {
    public readonly _tag: 'MapType' = 'MapType';

    constructor(
        name: string,
        is: MapType<K, V, A, O, I>['is'],
        validate: MapType<K, V, A, O, I>['validate'],
        encode: MapType<K, V, A, O, I>['encode'],
        public readonly keyType: K,
        public readonly valueType: V,
    ) {
        super(name, is, validate, encode);
    }
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface MapC<
    K extends t.Mixed,
    V extends t.Mixed
> extends MapType<
    K,
    V,
    Map<t.TypeOf<K>, t.TypeOf<V>>,
    {[_ in t.OutputOf<K>]: t.OutputOf<V>},
    unknown
> {}

export const map = <K extends t.Mixed, V extends t.Mixed>(
    keyCodec: K,
    valueCodec: V,
    name = `Map<${keyCodec.name}, ${valueCodec.name}>`,
) => new MapType(
    name,
    (u): u is Map<t.TypeOf<K>, t.TypeOf<V>> => {
        if (!(u instanceof Map)) {
            return false;
        }

        for (const [key, value] of u.entries()) {
            if (!keyCodec.is(key)) {
                return false;
            }
            if (!valueCodec.is(value)) {
                return false;
            }
        }

        return true;
    },
    (inputMap, context) => {
        if (
            (!(inputMap instanceof Map) && typeof inputMap !== 'object')
            || inputMap === null
        ) {
            return t.failure(inputMap, context);
        }

        let inputEntries;
        let outputMap;
        let i = 0;
        const errors: t.Errors = [];

        if (inputMap instanceof Map) {
            inputEntries = inputMap.entries();
            outputMap = inputMap;
        } else {
            inputEntries = Object.entries(inputMap);
            outputMap = new Map(inputEntries);
        }

        for (const [key, value] of inputEntries) {
            const keyResult = keyCodec.validate(
                key,
                context.concat([{
                    key: String(i),
                    type: keyCodec,
                    actual: key,
                    mapKey: key,
                    isKey: true,
                } as t.ContextEntry]),
            );
            const valueResult = valueCodec.validate(
                value,
                context.concat([{
                    key: String(i),
                    type: valueCodec,
                    actual: value,
                    mapKey: key,
                } as t.ContextEntry]),
            );

            if (isLeft(keyResult)) {
                errors.push(...keyResult.left);
            } else if (isLeft(valueResult)) {
                errors.push(...valueResult.left);
            } else {
                const typedKey = keyResult.right;
                const typedValue = valueResult.right;

                if (typedKey !== key || typedValue !== value) {
                    if (inputMap === outputMap) {
                        outputMap = new Map(inputEntries);
                    }

                    outputMap.delete(key);
                    outputMap.set(typedKey, typedValue);
                }
            }

            i += 1;
        }

        if (errors.length > 0) {
            return t.failures(errors);
        } else {
            return t.success(outputMap);
        }
    },
    (a) => Object.fromEntries(
        (function* mapEntries() {
            const entries = a.entries();

            for (const [key, value] of entries) {
                yield [
                    keyCodec.encode(key),
                    valueCodec.encode(value),
                ];
            }
        }()),
    ),
    keyCodec,
    valueCodec,
);
