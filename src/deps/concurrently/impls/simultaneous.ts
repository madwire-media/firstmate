import { Concurrently } from '..';

type Await<T> = T extends Promise<infer R> ? R : T;

export const concurrently: Concurrently = (initial, cb, concurrency) => {
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
                    resolve();
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
                    reject(error);
                    return;
                }

                if (result instanceof Array) {
                    queue.push(...result);
                }

                inProgress--;
                nextStep();
            })();

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
