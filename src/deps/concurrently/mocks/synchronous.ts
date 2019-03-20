import { ConcurrentCallback, Concurrently } from '..';
import { PromiseResult, Result } from '../../../util/result';

// Simplified implementation with constant concurrency of 1
export const concurrently: Concurrently = async <T, E>(
    initial: T[],
    cb: ConcurrentCallback<T, E>,
    concurrency?: number,
): PromiseResult<void, E> => {
    if (concurrency < 0) {
        throw new RangeError('concurrency cannot be less than 0');
    }

    const queue = initial.slice();

    while (queue.length > 0) {
        const result = await cb(queue.shift());

        if (!(result instanceof Result)) {
            continue;
        } else if (result.isErr()) {
            return result;
        } else if (result.value instanceof Array) {
            queue.push(...result.value);
        }
    }

    return Result.voidOk;
};
