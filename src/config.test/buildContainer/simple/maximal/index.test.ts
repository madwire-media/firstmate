import { loadConfig } from '../../../../helpers/config';
import { testServices } from '../../../testConfig';

describe('schema tests - buildContainer', () => {
    describe('simple tests', () => {
        test('maximal schema', () => {
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
                    },
                },
            }, config!.services);
        });
    });
});
