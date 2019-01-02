import { loadConfig } from '../../../../helpers/config';
import { testServices } from '../../../testConfig';

describe('schema tests - general', () => {
    describe('inheritFrom', () => {
            test('allowedModes inheritance', () => {
            const config = loadConfig(undefined, __dirname);

            expect(config).toBeDefined();

            testServices({
                test: {
                    type: 'pureHelm',
                    branches: {
                        '~default': {
                            dev: {
                                cluster: 'cluster',
                            },
                            stage: {
                                cluster: 'cluster',
                            },
                            prod: {
                                chartmuseum: 'museum',
                                cluster: 'cluster',
                            },
                        },
                        'one': {
                            dev: {
                                cluster: 'cluster',
                            },
                            stage: null,
                            prod: null,
                        },
                        'two': {
                            dev: null,
                            stage: {
                                cluster: 'cluster',
                            },
                            prod: null,
                        },
                    },
                },
            }, config!.parsed.services);
        });
    });
});
