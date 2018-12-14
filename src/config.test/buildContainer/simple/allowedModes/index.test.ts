import { loadConfig } from '../../../../helpers/config';
import { testServices } from '../../../testConfig';

describe('schema tests - buildContainer', () => {
    describe('simple tests', () => {
        test('allowed modes', () => {
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
                                version: 'test',
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
                                version: 'test',
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
                        'dev': {
                            dev: {
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
                            stage: null,
                            prod: null,
                        },
                        'stage': {
                            dev: null,
                            stage: {
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
                            prod: null,
                        },
                        'prod': {
                            dev: null,
                            stage: null,
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
