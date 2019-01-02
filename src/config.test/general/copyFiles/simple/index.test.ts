import { loadConfig } from '../../../../helpers/config';
import { testServices } from '../../../testConfig';

describe('schema tests - general', () => {
    describe('copyFiles', () => {
        test('simple schema', () => {
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
                    },
                },
            }, config!.parsed.services);
        });
    });
});
