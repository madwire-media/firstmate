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
                                            {
                                                local: 3548,
                                                remote: 3548,
                                            },
                                            {
                                                local: 6247,
                                                remote: 1337,
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
                                            {
                                                local: 8453,
                                                remote: 8453,
                                            },
                                            {
                                                local: 7331,
                                                remote: 7426,
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
                                            {
                                                local: 3548,
                                                remote: 3548,
                                            },
                                            {
                                                local: 6247,
                                                remote: 1337,
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
                                            {
                                                local: 8453,
                                                remote: 8453,
                                            },
                                            {
                                                local: 7331,
                                                remote: 7426,
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
                                            {
                                                local: 3548,
                                                remote: 3548,
                                            },
                                            {
                                                local: 6247,
                                                remote: 1337,
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
                                            {
                                                local: 8453,
                                                remote: 8453,
                                            },
                                            {
                                                local: 7331,
                                                remote: 7426,
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
                                registry: 'unregistry.com',
                                chartmuseum: 'unmuseum.com',
                                cluster: 'uncluster',
                                namespace: 'unnamespace',

                                releaseName: 'unrelease',
                                helmArgs: {
                                    bar: 'unfoo',
                                    mahna: 'unmahna',
                                },

                                imageNamePrefix: 'unprefix',
                                containers: {
                                    main: {
                                        volumes: {
                                            '/foo': 'unbar',
                                            '/mahna': 'unmahna',
                                        },
                                        dockerArgs: {
                                            arg1: 'unval1',
                                            arg2: 'unval2',
                                        },
                                        k8sVolumes: {
                                            '/k8s/foo': '/unbar',
                                            '/k8s/mahna': '/unmahna',
                                        },
                                        ports: [
                                            {
                                                local: 4835,
                                                remote: 4835,
                                            },
                                            {
                                                local: 4762,
                                                remote: 3713,
                                            },
                                        ],
                                        debugCMD: 'echo unhello',
                                    },
                                    secondary: {
                                        volumes: {
                                            '/ping': 'unpong',
                                            '/moo': 'unmoo',
                                        },
                                        dockerArgs: {
                                            arg3: 'unval1',
                                            arg4: 'unval2',
                                        },
                                        k8sVolumes: {
                                            '/k8s/ping': '/unpong',
                                            '/k8s/moo': '/unmoo',
                                        },
                                        ports: [
                                            {
                                                local: 5384,
                                                remote: 5384,
                                            },
                                            {
                                                local: 3173,
                                                remote: 2674,
                                            },
                                        ],
                                        debugCMD: 'echo unhola',
                                    },
                                },

                                mode: 'proxy',
                                pushDebugContainer: true,
                                autodelete: false,
                                recreatePods: false,
                            },
                            stage: {
                                registry: 'unregistry.com',
                                chartmuseum: 'unmuseum.com',
                                cluster: 'uncluster',
                                namespace: 'unnamespace',

                                releaseName: 'unrelease',
                                helmArgs: {
                                    bar: 'unfoo',
                                    mahna: 'unmahna',
                                },

                                imageNamePrefix: 'unprefix',
                                containers: {
                                    main: {
                                        volumes: {
                                            '/foo': 'unbar',
                                            '/mahna': 'unmahna',
                                        },
                                        dockerArgs: {
                                            arg1: 'unval1',
                                            arg2: 'unval2',
                                        },
                                        k8sVolumes: {
                                            '/k8s/foo': '/unbar',
                                            '/k8s/mahna': '/unmahna',
                                        },
                                        ports: [
                                            {
                                                local: 4835,
                                                remote: 4835,
                                            },
                                            {
                                                local: 4762,
                                                remote: 3713,
                                            },
                                        ],
                                        debugCMD: 'echo unhello',
                                    },
                                    secondary: {
                                        volumes: {
                                            '/ping': 'unpong',
                                            '/moo': 'unmoo',
                                        },
                                        dockerArgs: {
                                            arg3: 'unval1',
                                            arg4: 'unval2',
                                        },
                                        k8sVolumes: {
                                            '/k8s/ping': '/unpong',
                                            '/k8s/moo': '/unmoo',
                                        },
                                        ports: [
                                            {
                                                local: 5384,
                                                remote: 5384,
                                            },
                                            {
                                                local: 3173,
                                                remote: 2674,
                                            },
                                        ],
                                        debugCMD: 'echo unhola',
                                    },
                                },

                                recreatePods: false,
                            },
                            prod: {
                                registry: 'unregistry.com',
                                chartmuseum: 'unmuseum.com',
                                cluster: 'uncluster',
                                namespace: 'unnamespace',

                                releaseName: 'unrelease',
                                helmArgs: {
                                    bar: 'unfoo',
                                    mahna: 'unmahna',
                                },

                                imageNamePrefix: 'unprefix',
                                containers: {
                                    main: {
                                        volumes: {
                                            '/foo': 'unbar',
                                            '/mahna': 'unmahna',
                                        },
                                        dockerArgs: {
                                            arg1: 'unval1',
                                            arg2: 'unval2',
                                        },
                                        k8sVolumes: {
                                            '/k8s/foo': '/unbar',
                                            '/k8s/mahna': '/unmahna',
                                        },
                                        ports: [
                                            {
                                                local: 4835,
                                                remote: 4835,
                                            },
                                            {
                                                local: 4762,
                                                remote: 3713,
                                            },
                                        ],
                                        debugCMD: 'echo unhello',
                                    },
                                    secondary: {
                                        volumes: {
                                            '/ping': 'unpong',
                                            '/moo': 'unmoo',
                                        },
                                        dockerArgs: {
                                            arg3: 'unval1',
                                            arg4: 'unval2',
                                        },
                                        k8sVolumes: {
                                            '/k8s/ping': '/unpong',
                                            '/k8s/moo': '/unmoo',
                                        },
                                        ports: [
                                            {
                                                local: 5384,
                                                remote: 5384,
                                            },
                                            {
                                                local: 3173,
                                                remote: 2674,
                                            },
                                        ],
                                        debugCMD: 'echo unhola',
                                    },
                                },

                                version: 'untest',
                            },
                        },
                    },
                },
            }, config!.services);
        });
    });
});
