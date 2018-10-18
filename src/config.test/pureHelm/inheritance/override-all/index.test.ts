import { loadConfig } from '../../../../helpers/config';
import { testServices } from '../../../testConfig';

describe('schema tests - pureHelm', () => {
    describe('inheritance tests', () => {
        test('inherit all', () => {
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
                        'inherited': {
                            dev: {
                                chartmuseum: 'unmuseum.com',
                                cluster: 'uncluster',
                                namespace: 'unnamespace',

                                releaseName: 'unrelease',
                                helmArgs: {
                                    bar: 'unfoo',
                                    mahna: 'unmahna',
                                },

                                recreatePods: false,
                            },
                            stage: {
                                chartmuseum: 'unmuseum.com',
                                cluster: 'uncluster',
                                namespace: 'unnamespace',

                                releaseName: 'unrelease',
                                helmArgs: {
                                    bar: 'unfoo',
                                    mahna: 'unmahna',
                                },

                                recreatePods: false,
                            },
                            prod: {
                                chartmuseum: 'unmuseum.com',
                                cluster: 'uncluster',
                                namespace: 'unnamespace',

                                releaseName: 'unrelease',
                                helmArgs: {
                                    bar: 'unfoo',
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
