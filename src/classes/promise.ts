export interface DeferredPromise<T> {
    promise: Promise<T>;
    resolve(value?: T | PromiseLike<T>): void;
    reject(reason?: any): void;
}

export function defer<T>(): DeferredPromise<T> {
    let resolve: (value?: T | PromiseLike<T>) => void = undefined!;
    let reject: (reason?: any) => void = undefined!;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });

    return {promise, resolve, reject};
}
