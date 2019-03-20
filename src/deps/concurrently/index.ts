import { PromiseResult, Result } from '../../util/result';

export interface ConcurrencyOptions {
    concurrency: number;
}
export type ConcurrentCallback<T, E> = (item: T) =>
    | void
    | Result<void | T[], E>
    | PromiseResult<void | T[], E>;

export type Concurrently = <T, E = never>(
    initial: T[],
    cb: ConcurrentCallback<T, E>,
    concurrency?: number,
) => PromiseResult<void, E>;

export interface RequiresConcurrently {
    concurrently: Concurrently;
}
