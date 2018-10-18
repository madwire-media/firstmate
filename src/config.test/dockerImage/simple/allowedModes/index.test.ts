import { loadConfig } from '../../../../helpers/config';
import { testServices } from '../../../testConfig';

describe('schema tests - dockerImage', () => {
    describe('simple tests', () => {
        test('allowed modes', () => {
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
                                dockerArgs: {
                                    foo: 'bar',
                                    mahna: 'mahna',
                                },
                                pushImage: true,
                            },
                            stage: {
                                registry: 'registry.com',
                                imageName: 'image',
                                dockerArgs: {
                                    foo: 'bar',
                                    mahna: 'mahna',
                                },
                                pushImage: true,
                            },
                            prod: {
                                registry: 'registry.com',
                                imageName: 'image',
                                dockerArgs: {
                                    foo: 'bar',
                                    mahna: 'mahna',
                                },
                                version: 'test',
                            },
                        },
                        'dev': {
                            dev: {
                                registry: 'registry.com',
                                imageName: 'image',
                                dockerArgs: {
                                    foo: 'bar',
                                    mahna: 'mahna',
                                },
                                pushImage: true,
                            },
                            stage: null,
                            prod: null,
                        },
                        'stage': {
                            dev: null,
                            stage: {
                                registry: 'registry.com',
                                imageName: 'image',
                                dockerArgs: {
                                    foo: 'bar',
                                    mahna: 'mahna',
                                },
                                pushImage: true,
                            },
                            prod: null,
                        },
                        'prod': {
                            dev: null,
                            stage: null,
                            prod: {
                                registry: 'registry.com',
                                imageName: 'image',
                                dockerArgs: {
                                    foo: 'bar',
                                    mahna: 'mahna',
                                },
                                version: 'test',
                            },
                        },
                    },
                },
            }, config!.services);
        });
    });
});
