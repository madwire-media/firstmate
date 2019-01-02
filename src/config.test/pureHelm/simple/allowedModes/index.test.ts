import { loadConfig } from '../../../../helpers/config';
import { testServices } from '../../../testConfig';

describe('schema tests - pureHelm', () => {
    describe('simple tests', () => {
        test('allowed modes', () => {
            const config = loadConfig(undefined, __dirname);

            expect(config).toBeDefined();

            testServices({
                test: {
                    type: 'pureHelm',
                    branches: {
                        '~default': {
                            dev: {
                                chartmuseum: 'museum.com',
                                cluster: 'cluster',
                                namespace: 'namespace',

                                releaseName: 'release',
                                helmArgs: {
                                    bar: 'foo',
                                    mahna: 'mahna',
                                },

                                recreatePods: true,

                                version: 'test',
                            },
                            stage: {
                                chartmuseum: 'museum.com',
                                cluster: 'cluster',
                                namespace: 'namespace',

                                releaseName: 'release',
                                helmArgs: {
                                    bar: 'foo',
                                    mahna: 'mahna',
                                },

                                recreatePods: true,

                                version: 'test',
                            },
                            prod: {
                                chartmuseum: 'museum.com',
                                cluster: 'cluster',
                                namespace: 'namespace',

                                releaseName: 'release',
                                helmArgs: {
                                    bar: 'foo',
                                    mahna: 'mahna',
                                },

                                version: 'test',
                            },
                        },
                        'dev': {
                            dev: {
                                chartmuseum: 'museum.com',
                                cluster: 'cluster',
                                namespace: 'namespace',

                                releaseName: 'release',
                                helmArgs: {
                                    bar: 'foo',
                                    mahna: 'mahna',
                                },

                                recreatePods: true,

                                version: 'test',
                            },
                            stage: null,
                            prod: null,
                        },
                        'stage': {
                            dev: null,
                            stage: {
                                chartmuseum: 'museum.com',
                                cluster: 'cluster',
                                namespace: 'namespace',

                                releaseName: 'release',
                                helmArgs: {
                                    bar: 'foo',
                                    mahna: 'mahna',
                                },

                                recreatePods: true,

                                version: 'test',
                            },
                            prod: null,
                        },
                        'prod': {
                            dev: null,
                            stage: null,
                            prod: {
                                chartmuseum: 'museum.com',
                                cluster: 'cluster',
                                namespace: 'namespace',

                                releaseName: 'release',
                                helmArgs: {
                                    bar: 'foo',
                                    mahna: 'mahna',
                                },

                                version: 'test',
                            },
                        },
                    },
                },
            }, config!.parsed.services);
        });
    });
});
