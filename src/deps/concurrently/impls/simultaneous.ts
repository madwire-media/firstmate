import { ConcurrentCallback, Concurrently } from '..';
import { PromiseResult, Result } from '../../../util/result';

type Await<T> = T extends Promise<infer R> ? R : T;

export const concurrently: Concurrently = <T, E>(
    initial: T[],
    cb: ConcurrentCallback<T, E>,
    concurrency?: number,
): PromiseResult<void, E> => {
    return new Promise((resolve, reject) => {
        if (concurrency < 0) {
            throw new RangeError('concurrency cannot be less than 0');
        }

        const queue = initial.slice();
        let failed = false;
        let inLoop = false;
        let inProgress = 0;

        const nextStep = () => {
            if (failed) {
                return;
            }

            if (queue.length === 0) {
                if (inProgress === 0) {
                    resolve(Result.voidOk);
                }

                return;
            }

            const item = queue.shift();
            inProgress++;

            (async () => {
                let result: Await<ReturnType<typeof cb>>;

                try {
                    result = await cb(item);
                } catch (error) {
                    failed = true;
                    resolve(Result.Err(error));
                    return;
                }

                if (result instanceof Array) {
                    queue.push(...result);
                }

                inProgress--;
                nextStep();
            })().catch(reject);

            if (!inLoop) {
                inLoop = true;

                if (concurrency === 0) {
                    while (queue.length > 0) {
                        nextStep();
                    }
                } else {
                    while (queue.length > 0 && inProgress < concurrency) {
                        nextStep();
                    }
                }

                inLoop = false;
            }
        };

        nextStep();
    });
};
