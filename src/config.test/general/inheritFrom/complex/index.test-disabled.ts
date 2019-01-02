import { loadConfig } from '../../../../helpers/config';
import { testServices } from '../../../testConfig';

describe('schema tests - general', () => {
    describe('inheritFrom', () => {
        test('complex inheritance', () => {
            const config = loadConfig(undefined, __dirname);

            expect(config).toBeDefined();

            testServices({
                test: {
                    type: 'pureHelm',
                    branches: {
                        '~default': {
                            prod: {
                                chartmuseum: 'foomuseum',
                                cluster: 'foocluster',
                                releaseName: 'test',
                            },
                        },
                        'museum': {
                            prod: {
                                chartmuseum: 'barmuseum',
                                cluster: 'foocluster',
                                releaseName: 'test',
                            },
                        },
                        'cluster': {
                            prod: {
                                chartmuseum: 'foomuseum',
                                cluster: 'barcluster',
                                releaseName: 'test',
                            },
                        },
                        'museumcluster': {
                            prod: {
                                chartmuseum: 'barmuseum',
                                cluster: 'barcluster',
                                releaseName: 'test',
                            },
                        },
                        'defaultRelease': {
                            prod: {
                                chartmuseum: 'foomuseum',
                                cluster: 'foocluster',
                                releaseName: undefined,
                            },
                        },
                        'newRelease': {
                            prod: {
                                chartmuseum: 'foomuseum',
                                cluster: 'foocluster',
                                releaseName: 'overridden',
                            },
                        },
                    },
                },
            }, config!.parsed.services);
        });
    });
});
