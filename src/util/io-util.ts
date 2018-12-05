import * as t from 'io-ts';
import { createError, intoFailure, intoSuccess } from './io-errors';

export function refineRgx<T extends t.Type<string>>(
    rgx: RegExp,
    name: string,
    base?: T,
): t.Type<string> {
    if (base === undefined) {
        return refineRgx(rgx, name, t.string);
    }

    const predicate = (s: string) => rgx.test(s);

    return new t.RefinementType(
        name,
        (m): m is t.TypeOf<T> => base.is(m) && predicate(m),
        (i, c) => {
            const validation = base.validate(i, c);
            if (validation.isLeft()) {
                return validation;
            } else {
                const a = validation.value;

                if (predicate(a)) {
                    return intoSuccess(a);
                } else {
                    return intoFailure(createError(
                        a,
                        c,
                        `string does not match ${rgx}`,
                    ));
                }
            }
        },
        base.encode,
        base,
        predicate,
    );
}

type HasProps =
    | t.InterfaceType<any, any, any, any>
    | t.StrictType<any, any, any, any>
    | t.PartialType<any, any, any, any>;

type GetProps<T> =
    T extends t.InterfaceType<any, any, any, any> ?
        T['props'] :
    T extends t.StrictType<any, any, any, any> ?
        T['props'] :
    T extends t.PartialType<any, any, any, any> ?
        T['props'] :
    T extends t.RefinementType<infer T2, any, any, any> ?
        T2 extends HasProps ?
            T2['props'] :
            t.Props
        :
    T extends t.ReadonlyType<infer T2, any, any, any> ?
        T2 extends HasProps ?
            T2['props'] :
            t.Props
        :
    T extends t.IntersectionType<infer T2, any, any, any> ?
        T2 extends (infer T3)[] ?
            T3 extends HasProps ?
                t.Compact<T3['props']> :
                t.Props :
            never
        :
    never;

// interface ReadonlyProps extends t.ReadonlyType<t.HasProps, any, any, any> {};

// Pulled directly from io-ts source
export function getProps<
    T extends t.InterfaceType<any, any, any, any>
>(type: T): T['props'];
export function getProps<
    T extends t.StrictType<any, any, any, any>
>(type: T): T['props'];
export function getProps<
    T extends t.PartialType<any, any, any, any>
>(type: T): T['props'];
export function getProps<
    T extends t.HasPropsRefinement
>(type: T): GetProps<T['type']>;
export function getProps<
    T extends t.HasPropsReadonly
>(type: T): GetProps<T['type']>;
export function getProps<
    T extends t.HasPropsIntersection
>(type: T): GetProps<T>;
export function getProps(type: t.HasProps): t.Props;
export function getProps(type: t.HasProps) {
    switch (type._tag) {
        case 'RefinementType':
        case 'ReadonlyType':
            return getProps(type.type);
        case 'InterfaceType':
        case 'StrictType':
        case 'PartialType':
            return type.props;
        case 'IntersectionType':
            return type.types.reduce<t.Props>(
                (props, type) => Object.assign(props, getProps(type)),
                {},
            );
    }
}

// custom definition of intersection for more types
export function intersection<
    A extends t.Mixed,
    B extends t.Mixed,
    C extends t.Mixed,
    D extends t.Mixed,
    E extends t.Mixed,
    F extends t.Mixed,
    G extends t.Mixed
>(
    types: [A, B, C, D, E, F, G],
    name?: string
): t.IntersectionType<
    [A, B, C, D, E, F, G],
    t.Compact<
        t.TypeOf<A> &
        t.TypeOf<B> &
        t.TypeOf<C> &
        t.TypeOf<D> &
        t.TypeOf<E> &
        t.TypeOf<F> &
        t.TypeOf<G>
    >,
    t.Compact<
        t.OutputOf<A> &
        t.OutputOf<B> &
        t.OutputOf<C> &
        t.OutputOf<D> &
        t.OutputOf<E> &
        t.OutputOf<F> &
        t.OutputOf<G>
    >,
    t.mixed
>
export function intersection<
    A extends t.Mixed,
    B extends t.Mixed,
    C extends t.Mixed,
    D extends t.Mixed,
    E extends t.Mixed,
    F extends t.Mixed
>(
    types: [A, B, C, D, E, F],
    name?: string
): t.IntersectionType<
    [A, B, C, D, E, F],
    t.Compact<
        t.TypeOf<A> &
        t.TypeOf<B> &
        t.TypeOf<C> &
        t.TypeOf<D> &
        t.TypeOf<E> &
        t.TypeOf<F>
    >,
    t.Compact<
        t.OutputOf<A> &
        t.OutputOf<B> &
        t.OutputOf<C> &
        t.OutputOf<D> &
        t.OutputOf<E> &
        t.OutputOf<F>
    >,
    t.mixed
>
export function intersection<
    A extends t.Mixed,
    B extends t.Mixed,
    C extends t.Mixed,
    D extends t.Mixed,
    E extends t.Mixed
>(
    types: [A, B, C, D, E],
    name?: string
): t.IntersectionType<
    [A, B, C, D, E],
    t.Compact<
        t.TypeOf<A> &
        t.TypeOf<B> &
        t.TypeOf<C> &
        t.TypeOf<D> &
        t.TypeOf<E>
    >,
    t.Compact<
        t.OutputOf<A> &
        t.OutputOf<B> &
        t.OutputOf<C> &
        t.OutputOf<D> &
        t.OutputOf<E>
    >,
    t.mixed
>
export function intersection<
    A extends t.Mixed,
    B extends t.Mixed,
    C extends t.Mixed,
    D extends t.Mixed
>(
    types: [A, B, C, D],
    name?: string
): t.IntersectionType<
    [A, B, C, D],
    t.Compact<
        t.TypeOf<A> &
        t.TypeOf<B> &
        t.TypeOf<C> &
        t.TypeOf<D>
    >,
    t.Compact<
        t.OutputOf<A> &
        t.OutputOf<B> &
        t.OutputOf<C> &
        t.OutputOf<D>
    >,
    t.mixed
>
export function intersection<
    A extends t.Mixed,
    B extends t.Mixed,
    C extends t.Mixed
>(
    types: [A, B, C],
name?: string
): t.IntersectionType<
    [A, B, C],
    t.Compact<
        t.TypeOf<A> &
        t.TypeOf<B> &
        t.TypeOf<C>
    >,
    t.Compact<
        t.OutputOf<A> &
        t.OutputOf<B> &
        t.OutputOf<C>
    >,
    t.mixed
>
export function intersection<
    A extends t.Mixed,
    B extends t.Mixed
>(
    types: [A, B],
    name?: string
): t.IntersectionType<
    [A, B],
    t.Compact<
        t.TypeOf<A> &
        t.TypeOf<B>
    >, t.Compact<
        t.OutputOf<A> &
        t.OutputOf<B>
    >,
    t.mixed
>
export function intersection<
    A extends t.Mixed
>(
    types: [A],
    name?: string
): t.IntersectionType<
    [A],
    t.TypeOf<A>,
    t.OutputOf<A>,
    t.mixed
>
export function intersection<RTS extends Array<t.Mixed>>(
    types: RTS,
    name: string = `(${types.map(type => type.name).join(' & ')})`
): t.IntersectionType<RTS, any, any, t.mixed> {
    return t.intersection(types as any, name) as any;
}
