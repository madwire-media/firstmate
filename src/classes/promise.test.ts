import { defer } from './promise';

describe('promise deferring', () => {
    test('resolves', async () => {
        const {promise, resolve} = defer();

        const result = expect(promise).resolves.toBe(undefined);

        resolve();

        await result;
    });

    test('rejects', async () => {
        const {promise, reject} = defer();

        const result = expect(promise).rejects.toBe(undefined);

        reject();

        await result;
    });
});
