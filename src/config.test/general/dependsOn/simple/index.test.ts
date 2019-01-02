import { loadConfig } from '../../../../helpers/config';
import { testServices } from '../../../testConfig';

describe('schema tests - general', () => {
    describe('dependsOn', () => {
        test('basic functionality', () => {
            const config = loadConfig(undefined, __dirname);

            expect(config).toBeDefined();

            testServices({
                test: {
                    type: 'pureHelm',
                    branches: {
                        '~default': {
                            dev: {
                                cluster: 'cluster',
                                chartmuseum: 'museum',
                                namespace: 'test',
                                dependsOn: ['dep1', 'dep2'],
                            },
                        },
                    },
                },
                dep1: {
                    type: 'buildContainer',
                    branches: {
                        '~default': {},
                    },
                },
                dep2: {
                    type: 'buildContainer',
                    branches: {
                        '~default': {},
                    },
                },
            }, config!.parsed.services);
        });
    });
});
