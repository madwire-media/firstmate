import { loadConfig } from '../../../../helpers/config';
import { testServices } from '../../../testConfig';

describe('schema tests - dockerDeployment', () => {
    describe('simple tests', () => {
        test('minimal schema', () => {
            const config = loadConfig(undefined, __dirname);

            expect(config).toBeDefined();

            testServices({
                test: {
                    type: 'dockerDeployment',
                    branches: {
                        '~default': {
                            dev: {
                                registry: 'registry.com',
                                chartmuseum: 'museum.com',
                                cluster: 'cluster',
                                namespace: 'namespace',
                            },
                            stage: {
                                registry: 'registry.com',
                                chartmuseum: 'museum.com',
                                cluster: 'cluster',
                                namespace: 'namespace',
                            },
                            prod: {
                                registry: 'registry.com',
                                chartmuseum: 'museum.com',
                                cluster: 'cluster',
                                namespace: 'namespace',
                                version: 'test',
                            },
                        },
                    },
                },
            }, config!.parsed.services);
        });
    });
});
