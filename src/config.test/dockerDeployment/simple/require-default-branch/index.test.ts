import { loadConfig } from '../../../../helpers/config';

describe('schema tests - dockerDeployment', () => {
    describe('simple tests', () => {
        test('require ~default branch', () => {
            const config = loadConfig(undefined, __dirname);

            expect(config).toBeUndefined();
        });
    });
});
