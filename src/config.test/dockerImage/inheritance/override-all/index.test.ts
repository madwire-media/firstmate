import { loadConfig } from '../../../../helpers/config';
import { testServices } from '../../../testConfig';

describe('schema tests - dockerImage', () => {
    describe('inheritance tests', () => {
        test('inherit all', () => {
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
                        'inherited': {
                            dev: {
                                registry: 'unregistry.com',
                                imageName: 'unimage',
                                dockerArgs: {
                                    foo: 'unbar',
                                    mahna: 'unmahna',
                                },
                                pushImage: false,
                            },
                            stage: {
                                registry: 'unregistry.com',
                                imageName: 'unimage',
                                dockerArgs: {
                                    foo: 'unbar',
                                    mahna: 'unmahna',
                                },
                                pushImage: false,
                            },
                            prod: {
                                registry: 'unregistry.com',
                                imageName: 'unimage',
                                dockerArgs: {
                                    foo: 'unbar',
                                    mahna: 'unmahna',
                                },
                                version: 'untest',
                            },
                        },
                    },
                },
            }, config!.services);
        });
    });
});
