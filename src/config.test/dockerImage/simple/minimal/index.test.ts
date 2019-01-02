import { loadConfig } from '../../../../helpers/config';
import { testServices } from '../../../testConfig';

describe('schema tests - dockerImage', () => {
    describe('simple tests', () => {
        test('minimal schema', () => {
            const config = loadConfig(undefined, __dirname);

            expect(config).toBeDefined();

            testServices({
                test: {
                    type: 'dockerImage',
                    branches: {
                        '~default': {
                            dev: {
                                registry: 'registry.com',
                                imageName: 'image',
                            },
                            stage: {
                                registry: 'registry.com',
                                imageName: 'image',
                            },
                            prod: {
                                registry: 'registry.com',
                                imageName: 'image',
                                version: 'test',
                            },
                        },
                    },
                },
            }, config!.parsed.services);
        });
    });
});
