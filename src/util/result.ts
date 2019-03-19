import { inspect } from 'util';

// Heavily inspired by Rust
export abstract class Result<T, E> {
    public static Ok<T>(value: T): ResultOk<T> {
        return new ResultOk(value);
    }
    public static Err<E>(error: E): ResultErr<E> {
        return new ResultErr(error);
    }

    public abstract isOk(): this is ResultOk<T>;
    public abstract isErr(): this is ResultErr<E>;
    public abstract ok(): T | undefined;
    public abstract err(): E | undefined;
    public abstract map<U>(op: (value: T) => U): Result<U, E>;
    public abstract mapOrElse<U>(fallback: (error: E) => U, map: (value: T) => U): U;
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
}

type Unused = any;

export class ResultOk<T> extends Result<T, any> {
    public readonly value: T;

    constructor(value: T) {
        super();

        this.value = value;
    }

    public isOk(): true {
        return true;
    }
    public isErr(): false {
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
    public mapOrElse<U>(fallback: Unused, map: (value: T) => U): U {
        return map(this.value);
    }
    public mapErr(op?: Unused): ResultOk<T> {
        return this;
    }
    public and<R extends Result<any, any>>(res: R): R {
        return res;
    }
    public andThen<R extends Result<any, any>>(op: (value: T) => R): R {
        return op(this.value);
    }
    public or(res?: Unused): ResultOk<T> {
        return this;
    }
    public orElse(op?: Unused): ResultOk<T> {
        return this;
    }
    public unwrapOr(optb?: Unused): T {
        return this.value;
    }
    public unwrapOrElse(op?: Unused): T {
        return this.value;
    }
    public unwrap(): T {
        return this.value;
    }
    public expect(msg?: Unused): T {
        return this.value;
    }
    public unwrapErr(): never {
        return this.expectErr('called Result.unwrapErr() on an `Ok` value');
    }
    public expectErr(msg: string): never {
        throw new Error(`${msg}: ${inspect(this.value)}`);
    }
}

export class ResultErr<E> extends Result<any, E> {
    public readonly error: E;

    constructor(error: E) {
        super();

        this.error = error;
    }

    public isOk(): false {
        return false;
    }
    public isErr(): true {
        return true;
    }
    public ok(): undefined {
        return undefined;
    }
    public err(): E {
        return this.error;
    }
    public map(op?: Unused): ResultErr<E> {
        return this;
    }
    public mapOrElse<U>(fallback: (error: E) => U, map: Unused): U {
        return fallback(this.error);
    }
    public mapErr<F>(op: (error: E) => F): ResultErr<F> {
        return new ResultErr(op(this.error));
    }
    public and(res?: Unused): ResultErr<E> {
        return this;
    }
    public andThen(op?: Unused): ResultErr<E> {
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
    public expectErr(msg: Unused): E {
        return this.error;
    }
}
