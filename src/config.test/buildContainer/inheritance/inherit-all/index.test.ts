import { loadConfig } from '../../../../helpers/config';
import { testServices } from '../../../testConfig';

describe('schema tests - buildContainer', () => {
    describe('inheritance tests', () => {
        test('inherit all', () => {
            const config = loadConfig(undefined, __dirname);

            expect(config).toBeDefined();

            testServices({
                test: {
                    type: 'buildContainer',
                    branches: {
                        '~default': {
                            dev: {
                                volumes: {
                                    '/foo': 'bar',
                                    '/mahna': 'mahna',
                                },
                                dockerArgs: {
                                    foo: 'bar',
                                    mahna: 'mahna',
                                },
                            },
                            stage: {
                                volumes: {
                                    '/foo': 'bar',
                                    '/mahna': 'mahna',
                                },
                                dockerArgs: {
                                    foo: 'bar',
                                    mahna: 'mahna',
                                },
                            },
                            prod: {
                                volumes: {
                                    '/foo': 'bar',
                                    '/mahna': 'mahna',
                                },
                                dockerArgs: {
                                    foo: 'bar',
                                    mahna: 'mahna',
                                },
                                version: 'test',
                            },
                        },
                        'inherited': {
                            dev: {
                                volumes: {
                                    '/foo': 'bar',
                                    '/mahna': 'mahna',
                                },
                                dockerArgs: {
                                    foo: 'bar',
                                    mahna: 'mahna',
                                },
                            },
                            stage: {
                                volumes: {
                                    '/foo': 'bar',
                                    '/mahna': 'mahna',
                                },
                                dockerArgs: {
                                    foo: 'bar',
                                    mahna: 'mahna',
                                },
                            },
                            prod: {
                                volumes: {
                                    '/foo': 'bar',
                                    '/mahna': 'mahna',
                                },
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
