export interface ConcurrencyOptions {
    concurrency: number;
}
export type ConcurrentCallback<T> = (item: T) => void | T[] | Promise<void> | Promise<T[]>;

export type Concurrently = <T>(initial: T[], cb: ConcurrentCallback<T>, concurrency?: number) => Promise<void>;

export interface RequiresConcurrently {
    concurrently: Concurrently;
}
