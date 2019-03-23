import { inspect } from 'util';

let voidOk: ResultOk<void>;
let voidErr: ResultErr<void>;

// Heavily inspired by Rust
abstract class AbstractResult<T, E> {
    public static promise = {
        Ok<T>(value: T | Promise<T>): Promise<ResultOk<T>> {
            if (value instanceof Promise) {
                return value.then(Result.Ok);
            } else {
                return Promise.resolve(Result.Ok(value));
            }
        },
        Err<E>(error: E | Promise<E>): Promise<ResultErr<E>> {
            if (error instanceof Promise) {
                return error.then(Result.Err);
            } else {
                return Promise.resolve(Result.Err(error));
            }
        },

        mapToOk<T, U>(cb: (value: T) => U | Promise<U>): (value: T) => ResultOk<U> | Promise<ResultOk<U>> {
            return (value: T) => {
                const newValue = cb(value);

                if (newValue instanceof Promise) {
                    return newValue.then(Result.Ok);
                } else {
                    return Result.Ok(newValue);
                }
            };
        },
        mapToErr<E, F>(cb: (error: E) => F | Promise<F>): (error: E) => ResultErr<F> | Promise<ResultErr<F>> {
            return (error: E) => {
                const newValue = cb(error);

                if (newValue instanceof Promise) {
                    return newValue.then(Result.Err);
                } else {
                    return Result.Err(newValue);
                }
            };
        },
    };

    public static get voidOk(): ResultOk<void> {
        return voidOk;
    }
    public static get voidErr(): ResultErr<void> {
        return voidErr;
    }

    public static Ok<T>(value: T): ResultOk<T> {
        return new ResultOk(value);
    }
    public static Err<E>(error: E): ResultErr<E> {
        return new ResultErr(error);
    }

    public static mapToOk<T, U>(cb: (value: T) => U): (value: T) => ResultOk<U> {
        return (value: T) => {
            return Result.Ok(cb(value));
        };
    }
    public static mapToErr<E, F>(cb: (error: E) => F): (error: E) => ResultErr<F> {
        return (error: E) => {
            return Result.Err(cb(error));
        };
    }

    public static fromCallback<T, E = Error>(cb: () => T): Result<T, E> {
        let value: T;

        try {
            value = cb();
        } catch (error) {
            return Result.Err(error);
        }

        return Result.Ok(value);
    }
    public static fromPromise<T, E = Error>(promise: Promise<T>): PromiseResult<T, E> {
        return promise.then(Result.Ok, Result.Err);
    }
    public static abstract<T, E>(result: Result<T, E>): AbstractResult<T, E> {
        return result;
    }
    public static async<T, E>(result: Promise<Result<T, E>> | Result<T, E>): AsyncResult<T, E> {
        if (result instanceof Promise) {
            return new AsyncResult(result);
        } else {
            return new AsyncResult(Promise.resolve(result));
        }
    }

    public abstract isOk(): this is ResultOk<T>;
    public abstract isErr(): this is ResultErr<E>;
    public abstract ok(): T | undefined;
    public abstract err(): E | undefined;
    public abstract map<U>(op: (value: T) => U): Result<U, E>;
    public abstract mapErr<F>(op: (error: E) => F): Result<T, F>;
    public abstract and<U>(res: Result<U, E>): Result<U, E>;
    public abstract andThen<U>(op: (value: T) => Result<U, E>): Result<U, E>;
    public abstract or<F>(res: Result<T, F>): Result<T, F>;
    public abstract orElse<F>(op: (error: E) => Result<T, F>): Result<T, F>;
    public abstract unwrapOr(optb: T): T;
    public abstract unwrapOrElse(op: (error: E) => T): T;
    public abstract unwrap(): T;
    public abstract expect(msg: string): T;
    public abstract unwrapErr(): E;
    public abstract expectErr(msg: string): E;

    public abstract mapVoid(): Result<void, E>;
    public abstract mapErrVoid(): Result<T, void>;
    public abstract unwrapRaw(): T;
    public abstract inspect(op: (value: T) => any): Result<T, E>;
    public abstract inspectErr(op: (error: E) => any): Result<T, E>;

    public abstract<U, F>(this: Result<U, F>): AbstractResult<U, F> {
        return this;
    }
    public mapOrElse<U, T, E>(this: Result<T, E>, fallback: (error: E) => U, map: (value: T) => U): U {
        if (this.isOk()) {
            return map(this.value);
        } else if (this.isErr()) {
            return fallback(this.error);
        }
    }
    public mapAll<T, E, U, F>(this: Result<T, E>, mapOk: (value: T) => U, mapErr: (error: E) => F): Result<U, F> {
        if (this.isOk()) {
            return Result.Ok(mapOk(this.value));
        } else {
            return Result.Err(mapErr(this.error));
        }
    }
}

function passthru<R>(_: any, result: R): R {
    return result;
}

export class AsyncResult<T, E> {
    private readonly internal: PromiseResult<T, E>;

    constructor(internal: PromiseResult<T, E>) {
        this.internal = internal;
    }

    public then<U, F>(
        mapOk: (value: T, result: ResultOk<T>) => Result<U, F> | Promise<Result<U, F>>,
        mapErr: (error: E, result: ResultErr<E>) => Result<U, F> | Promise<Result<U, F>>,
    ): AsyncResult<U, F> {
        return new AsyncResult(
            this.internal.then((result) => {
                if (result.isOk()) {
                    return mapOk(result.value, result);
                } else {
                    return mapErr(result.error, result);
                }
            }),
        );
    }

    public map<U>(op: (value: T) => U | Promise<U>): AsyncResult<U, E> {
        return this.then(
            Result.promise.mapToOk(op),
            passthru,
        );
    }
    public mapErr<F>(op: (error: E) => F | Promise<F>): AsyncResult<T, F> {
        return this.then(
            passthru,
            Result.promise.mapToErr(op),
        );
    }
    public and<U>(res: Result<U, E> | PromiseResult<U, E>): AsyncResult<U, E> {
        return this.then(
            () => res,
            passthru,
        );
    }
    public andThen<U>(op: (value: T) => Result<U, E> | PromiseResult<U, E>): AsyncResult<U, E> {
        return this.then(
            op,
            passthru,
        );
    }
    public or<F>(res: Result<T, F> | PromiseResult<T, F>): AsyncResult<T, F> {
        return this.then(
            passthru,
            () => res,
        );
    }
    public orElse<F>(op: (error: E) => Result<T, F> | PromiseResult<T, F>): AsyncResult<T, F> {
        return this.then(
            passthru,
            op,
        );
    }

    public mapVoid(): AsyncResult<void, E> {
        return this.then(
            () => Result.voidOk,
            passthru,
        );
    }
    public mapErrVoid(): AsyncResult<T, void> {
        return this.then(
            passthru,
            () => Result.voidErr,
        );
    }
    public inspect(op: (value: T) => any | Promise<any>): AsyncResult<T, E> {
        return this.then(
            async (value, result) => {
                await op(value);
                return result;
            },
            passthru,
        );
    }
    public inspectErr(op: (error: E) => any | Promise<any>): AsyncResult<T, E> {
        return this.then(
            passthru,
            async (error, result) => {
                await op(error);
                return result;
            },
        ); ;
    }

    public promise(): PromiseResult<T, E> {
        return this.internal;
    }
}

export type PromiseResult<T, E> = Promise<Result<T, E>>;

export type Result<T, E> = ResultOk<T> | ResultErr<E>;
export const Result = AbstractResult;

export class ResultOk<T> extends Result<T, any> {
    public readonly value: T;

    constructor(value: T) {
        super();

        this.value = value;
    }

    public isOk(): this is ResultOk<T> {
        return true;
    }
    public isErr(): this is ResultErr<any> {
        return false;
    }
    public ok(): T {
        return this.value;
    }
    public err(): undefined {
        return undefined;
    }
    public map<U>(op: (value: T) => U): ResultOk<U> {
        return new ResultOk(op(this.value));
    }
    // public mapOrElse<U>(_fallback, map: (value: T) => U): U {
    //     return map(this.value);
    // }
    public mapErr(): ResultOk<T> {
        return this;
    }
    public and<R extends Result<any, any>>(res: R): R {
        return res;
    }
    public andThen<R extends Result<any, any>>(op: (value: T) => R): R {
        return op(this.value);
    }
    public or(): ResultOk<T> {
        return this;
    }
    public orElse(): ResultOk<T> {
        return this;
    }
    public unwrapOr(): T {
        return this.value;
    }
    public unwrapOrElse(): T {
        return this.value;
    }
    public unwrap(): T {
        return this.value;
    }
    public expect(): T {
        return this.value;
    }
    public unwrapErr(): never {
        return this.expectErr('called Result.unwrapErr() on an `Ok` value');
    }
    public expectErr(msg: string): never {
        throw new Error(`${msg}: ${inspect(this.value)}`);
    }

    public mapVoid(): ResultOk<void> {
        return Result.voidOk;
    }
    public mapErrVoid(): ResultOk<T> {
        return this;
    }
    public unwrapRaw(): T {
        return this.value;
    }
    public inspect(op: (value: T) => any): ResultOk<T> {
        op(this.value);
        return this;
    }
    public inspectErr(): ResultOk<T> {
        return this;
    }
}

export class ResultErr<E> extends Result<any, E> {
    public readonly error: E;

    constructor(error: E) {
        super();

        this.error = error;
    }

    public isOk(): this is ResultOk<any> {
        return false;
    }
    public isErr(): this is ResultErr<E> {
        return true;
    }
    public ok(): undefined {
        return undefined;
    }
    public err(): E {
        return this.error;
    }
    public map(): ResultErr<E> {
        return this;
    }
    public mapErr<F>(op: (error: E) => F): ResultErr<F> {
        return new ResultErr(op(this.error));
    }
    public and(): ResultErr<E> {
        return this;
    }
    public andThen(): ResultErr<E> {
        return this;
    }
    public or<R extends Result<any, any>>(res: R): R {
        return res;
    }
    public orElse<R extends Result<any, any>>(op: (error: E) => R): R {
        return op(this.error);
    }
    public unwrapOr<T>(optb: T): T {
        return optb;
    }
    public unwrapOrElse<T>(op: (error: E) => T): T {
        return op(this.error);
    }
    public unwrap(): never {
        return this.expect('called Result.unwrap() on an `Err` value');
    }
    public expect(msg: string): never {
        throw new Error(`${msg}: ${inspect(this.error)}`);
    }
    public unwrapErr(): E {
        return this.error;
    }
    public expectErr(): E {
        return this.error;
    }

    public mapVoid(): ResultErr<E> {
        return this;
    }
    public mapErrVoid(): ResultErr<void> {
        return Result.voidErr;
    }
    public unwrapRaw(): never {
        throw this.error;
    }
    public inspect(): ResultErr<E> {
        return this;
    }
    public inspectErr(op: (error: E) => any): ResultErr<E> {
        op(this.error);
        return this;
    }
}

voidOk = new ResultOk(undefined);
voidErr = new ResultErr(undefined);
