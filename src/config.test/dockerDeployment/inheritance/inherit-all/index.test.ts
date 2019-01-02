import { loadConfig } from '../../../../helpers/config';
import { testServices } from '../../../testConfig';

describe('schema tests - dockerDeployment', () => {
    describe('inheritance tests', () => {
        test('inherit all', () => {
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

                                releaseName: 'release',
                                helmArgs: {
                                    bar: 'foo',
                                    mahna: 'mahna',
                                },

                                imageNamePrefix: 'prefix',
                                containers: {
                                    main: {
                                        volumes: {
                                            '/foo': 'bar',
                                            '/mahna': 'mahna',
                                        },
                                        dockerArgs: {
                                            arg1: 'val1',
                                            arg2: 'val2',
                                        },
                                        k8sVolumes: {
                                            '/k8s/foo': '/bar',
                                            '/k8s/mahna': '/mahna',
                                        },
                                        ports: [
                                            3548,
                                            {
                                                outer: 6247,
                                                inner: 1337,
                                            },
                                        ],
                                        debugCMD: 'echo hello',
                                    },
                                    secondary: {
                                        volumes: {
                                            '/ping': 'pong',
                                            '/moo': 'moo',
                                        },
                                        dockerArgs: {
                                            arg3: 'val1',
                                            arg4: 'val2',
                                        },
                                        k8sVolumes: {
                                            '/k8s/ping': '/pong',
                                            '/k8s/moo': '/moo',
                                        },
                                        ports: [
                                            8453,
                                            {
                                                outer: 7331,
                                                inner: 7426,
                                            },
                                        ],
                                        debugCMD: 'echo hola',
                                    },
                                },

                                mode: 'local',
                                pushDebugContainer: false,
                                autodelete: true,
                                recreatePods: true,
                            },
                            stage: {
                                registry: 'registry.com',
                                chartmuseum: 'museum.com',
                                cluster: 'cluster',
                                namespace: 'namespace',

                                releaseName: 'release',
                                helmArgs: {
                                    bar: 'foo',
                                    mahna: 'mahna',
                                },

                                imageNamePrefix: 'prefix',
                                containers: {
                                    main: {
                                        volumes: {
                                            '/foo': 'bar',
                                            '/mahna': 'mahna',
                                        },
                                        dockerArgs: {
                                            arg1: 'val1',
                                            arg2: 'val2',
                                        },
                                        k8sVolumes: {
                                            '/k8s/foo': '/bar',
                                            '/k8s/mahna': '/mahna',
                                        },
                                        ports: [
                                            3548,
                                            {
                                                outer: 6247,
                                                inner: 1337,
                                            },
                                        ],
                                        debugCMD: 'echo hello',
                                    },
                                    secondary: {
                                        volumes: {
                                            '/ping': 'pong',
                                            '/moo': 'moo',
                                        },
                                        dockerArgs: {
                                            arg3: 'val1',
                                            arg4: 'val2',
                                        },
                                        k8sVolumes: {
                                            '/k8s/ping': '/pong',
                                            '/k8s/moo': '/moo',
                                        },
                                        ports: [
                                            8453,
                                            {
                                                outer: 7331,
                                                inner: 7426,
                                            },
                                        ],
                                        debugCMD: 'echo hola',
                                    },
                                },

                                recreatePods: true,
                            },
                            prod: {
                                registry: 'registry.com',
                                chartmuseum: 'museum.com',
                                cluster: 'cluster',
                                namespace: 'namespace',

                                releaseName: 'release',
                                helmArgs: {
                                    bar: 'foo',
                                    mahna: 'mahna',
                                },

                                imageNamePrefix: 'prefix',
                                containers: {
                                    main: {
                                        volumes: {
                                            '/foo': 'bar',
                                            '/mahna': 'mahna',
                                        },
                                        dockerArgs: {
                                            arg1: 'val1',
                                            arg2: 'val2',
                                        },
                                        k8sVolumes: {
                                            '/k8s/foo': '/bar',
                                            '/k8s/mahna': '/mahna',
                                        },
                                        ports: [
                                            3548,
                                            {
                                                outer: 6247,
                                                inner: 1337,
                                            },
                                        ],
                                        debugCMD: 'echo hello',
                                    },
                                    secondary: {
                                        volumes: {
                                            '/ping': 'pong',
                                            '/moo': 'moo',
                                        },
                                        dockerArgs: {
                                            arg3: 'val1',
                                            arg4: 'val2',
                                        },
                                        k8sVolumes: {
                                            '/k8s/ping': '/pong',
                                            '/k8s/moo': '/moo',
                                        },
                                        ports: [
                                            8453,
                                            {
                                                outer: 7331,
                                                inner: 7426,
                                            },
                                        ],
                                        debugCMD: 'echo hola',
                                    },
                                },

                                version: 'test',
                            },
                        },
                        'inherited': {
                            dev: {
                                registry: 'registry.com',
                                chartmuseum: 'museum.com',
                                cluster: 'cluster',
                                namespace: 'namespace',

                                releaseName: 'release',
                                helmArgs: {
                                    bar: 'foo',
                                    mahna: 'mahna',
                                },

                                imageNamePrefix: 'prefix',
                                containers: {
                                    main: {
                                        volumes: {
                                            '/foo': 'bar',
                                            '/mahna': 'mahna',
                                        },
                                        dockerArgs: {
                                            arg1: 'val1',
                                            arg2: 'val2',
                                        },
                                        k8sVolumes: {
                                            '/k8s/foo': '/bar',
                                            '/k8s/mahna': '/mahna',
                                        },
                                        ports: [
                                            3548,
                                            {
                                                outer: 6247,
                                                inner: 1337,
                                            },
                                        ],
                                        debugCMD: 'echo hello',
                                    },
                                    secondary: {
                                        volumes: {
                                            '/ping': 'pong',
                                            '/moo': 'moo',
                                        },
                                        dockerArgs: {
                                            arg3: 'val1',
                                            arg4: 'val2',
                                        },
                                        k8sVolumes: {
                                            '/k8s/ping': '/pong',
                                            '/k8s/moo': '/moo',
                                        },
                                        ports: [
                                            8453,
                                            {
                                                outer: 7331,
                                                inner: 7426,
                                            },
                                        ],
                                        debugCMD: 'echo hola',
                                    },
                                },

                                mode: 'local',
                                pushDebugContainer: false,
                                autodelete: true,
                                recreatePods: true,
                            },
                            stage: {
                                registry: 'registry.com',
                                chartmuseum: 'museum.com',
                                cluster: 'cluster',
                                namespace: 'namespace',

                                releaseName: 'release',
                                helmArgs: {
                                    bar: 'foo',
                                    mahna: 'mahna',
                                },

                                imageNamePrefix: 'prefix',
                                containers: {
                                    main: {
                                        volumes: {
                                            '/foo': 'bar',
                                            '/mahna': 'mahna',
                                        },
                                        dockerArgs: {
                                            arg1: 'val1',
                                            arg2: 'val2',
                                        },
                                        k8sVolumes: {
                                            '/k8s/foo': '/bar',
                                            '/k8s/mahna': '/mahna',
                                        },
                                        ports: [
                                            3548,
                                            {
                                                outer: 6247,
                                                inner: 1337,
                                            },
                                        ],
                                        debugCMD: 'echo hello',
                                    },
                                    secondary: {
                                        volumes: {
                                            '/ping': 'pong',
                                            '/moo': 'moo',
                                        },
                                        dockerArgs: {
                                            arg3: 'val1',
                                            arg4: 'val2',
                                        },
                                        k8sVolumes: {
                                            '/k8s/ping': '/pong',
                                            '/k8s/moo': '/moo',
                                        },
                                        ports: [
                                            8453,
                                            {
                                                outer: 7331,
                                                inner: 7426,
                                            },
                                        ],
                                        debugCMD: 'echo hola',
                                    },
                                },

                                recreatePods: true,
                            },
                            prod: {
                                registry: 'registry.com',
                                chartmuseum: 'museum.com',
                                cluster: 'cluster',
                                namespace: 'namespace',

                                releaseName: 'release',
                                helmArgs: {
                                    bar: 'foo',
                                    mahna: 'mahna',
                                },

                                imageNamePrefix: 'prefix',
                                containers: {
                                    main: {
                                        volumes: {
                                            '/foo': 'bar',
                                            '/mahna': 'mahna',
                                        },
                                        dockerArgs: {
                                            arg1: 'val1',
                                            arg2: 'val2',
                                        },
                                        k8sVolumes: {
                                            '/k8s/foo': '/bar',
                                            '/k8s/mahna': '/mahna',
                                        },
                                        ports: [
                                            3548,
                                            {
                                                outer: 6247,
                                                inner: 1337,
                                            },
                                        ],
                                        debugCMD: 'echo hello',
                                    },
                                    secondary: {
                                        volumes: {
                                            '/ping': 'pong',
                                            '/moo': 'moo',
                                        },
                                        dockerArgs: {
                                            arg3: 'val1',
                                            arg4: 'val2',
                                        },
                                        k8sVolumes: {
                                            '/k8s/ping': '/pong',
                                            '/k8s/moo': '/moo',
                                        },
                                        ports: [
                                            8453,
                                            {
                                                outer: 7331,
                                                inner: 7426,
                                            },
                                        ],
                                        debugCMD: 'echo hola',
                                    },
                                },

                                version: 'test',
                            },
                        },
                    },
                },
            }, config!.parsed.services);
        });
    });
});
