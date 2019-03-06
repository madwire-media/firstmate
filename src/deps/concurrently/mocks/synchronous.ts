import { Concurrently } from '..';

// Simplified implementation with constant concurrency of 1
export const concurrently: Concurrently = async (initial, cb, concurrency) => {
    if (concurrency < 0) {
        throw new RangeError('concurrency cannot be less than 0');
    }

    const queue = initial.slice();

    while (queue.length > 0) {
        const result = await cb(queue.shift());

        if (result instanceof Array) {
            queue.push(...result);
        }
    }
};
