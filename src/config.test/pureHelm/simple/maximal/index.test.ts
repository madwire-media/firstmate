import { loadConfig } from '../../../../helpers/config';
import { testServices } from '../../../testConfig';

describe('schema tests - pureHelm', () => {
    describe('simple tests', () => {
        test('maximal schema', () => {
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
                    },
                },
            }, config!.services);
        });
    });
});
