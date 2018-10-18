import { loadConfig } from '../../../../helpers/config';
import { testServices } from '../../../testConfig';

describe('schema tests - dockerImage', () => {
    describe('simple tests', () => {
        test('ignore ~[name] branches', () => {
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
            }, config!.services);
        });
    });
});
