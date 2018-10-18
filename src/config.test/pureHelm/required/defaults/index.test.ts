import { loadConfig } from '../../../../helpers/config';
import { testServices } from '../../../testConfig';

describe('schema tests - pureHelm', () => {
    describe('required properties', () => {
        test('defaults', () => {
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
                            },
                            stage: {
                                chartmuseum: 'museum.com',
                                cluster: 'cluster',
                                namespace: 'namespace',
                            },
                            prod: {
                                chartmuseum: 'museum.com',
                                cluster: 'cluster',
                                namespace: 'namespace',

                                version: 'test',
                            },
                        },
                    },
                },
            }, config!.services);
        });
    });
});
