import { loadConfig } from '../../../../helpers/config';
import { testServices } from '../../../testConfig';

describe('schema tests - general', () => {
    describe('copyFiles', () => {
        test('inheritance test', () => {
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
                                copyFiles: {
                                    'to/location/1': 'from/1',
                                    'to/location/2': 'from/2',
                                },
                            },
                        },
                        'inheritTest': {
                            dev: {
                                cluster: 'cluster',
                                chartmuseum: 'museum',
                                namespace: 'test',
                                copyFiles: {
                                    'to/location/1': 'from/overridden',
                                    'to/location/2': 'from/2',
                                    'to/location/3': 'from/3',
                                },
                            },
                        },
                    },
                },
            }, config!.services);
        });
    });
});
