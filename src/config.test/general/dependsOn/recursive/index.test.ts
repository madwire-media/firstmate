import { loadConfig } from '../../../../helpers/config';

describe('schema tests - general', () => {
    describe('dependsOn', () => {
        test('invalid recursion', () => {
            const config = loadConfig(undefined, __dirname);

            expect(config).toBeUndefined();
        });
    });
});
