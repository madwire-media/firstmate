import { loadConfig } from '../../../../helpers/config';

describe('schema tests - dockerDeployment', () => {
    describe('required properties', () => {
        test('fail without chartmuseum', () => {
            const config = loadConfig(undefined, __dirname);

            expect(config).toBeUndefined();
        });
    });
});
