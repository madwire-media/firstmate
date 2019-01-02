import { loadConfig } from '../../../../helpers/config';
import { testServices } from '../../../testConfig';

describe('schema tests - buildContainer', () => {
    describe('simple tests', () => {
        test('minimal schema', () => {
            const config = loadConfig(undefined, __dirname);

            expect(config).toBeDefined();

            testServices({
                test: {
                    type: 'buildContainer',
                    branches: {
                        '~default': {
                            dev: {
                            },
                            stage: {
                            },
                            prod: {
                                version: 'test',
                            },
                        },
                    },
                },
            }, config!.parsed.services);
        });
    });
});
