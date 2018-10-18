import { loadConfig } from '../../../../helpers/config';

describe('schema tests - dockerImage', () => {
    describe('simple tests', () => {
        test('require ~default branch', () => {
            const config = loadConfig(undefined, __dirname);

            expect(config).toBeUndefined();
        });
    });
});
