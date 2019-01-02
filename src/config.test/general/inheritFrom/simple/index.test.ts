import { loadConfig } from '../../../../helpers/config';
import { testServices } from '../../../testConfig';

describe('schema tests - general', () => {
    describe('inheritFrom', () => {
        test('simple inheritance', () => {
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
                            },
                        },
                        'museum': {
                            prod: {
                                chartmuseum: 'barmuseum',
                                cluster: 'foocluster',
                            },
                        },
                        'cluster': {
                            prod: {
                                chartmuseum: 'foomuseum',
                                cluster: 'barcluster',
                            },
                        },
                    },
                },
            }, config!.parsed.services);
        });
    });
});
