import { loadConfig } from '../../../../helpers/config';

describe('schema tests - general', () => {
    describe('inheritFrom', () => {
        test('simple inheritance', () => {
            const config = loadConfig(undefined, __dirname);

            expect(config).toBeUndefined();
        });
    });
});
