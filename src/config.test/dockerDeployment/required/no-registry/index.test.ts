import { loadConfig } from '../../../../helpers/config';

describe('schema tests - dockerDeployment', () => {
    describe('required properties', () => {
        test('fail without registry', () => {
            const config = loadConfig(undefined, __dirname);

            expect(config).toBeUndefined();
        });
    });
});
