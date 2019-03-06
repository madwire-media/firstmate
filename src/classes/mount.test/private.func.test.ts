import { InMemoryFs, RawFiles } from '../../deps/fs/mocks/in-memory';
import { Endpoints, StaticHttp } from '../../deps/http/mocks/static';
import { NodePath } from '../../deps/path/impls/node';
import { UnimplementedProcess } from '../../deps/process/mocks/unimplemented';
import { emptyDeps } from '../../util/container/mock';
import { MountHelper, MountRecord } from '../mount.private';

describe('mount subsystem private method unit tests', () => {
    describe('isHttp', () => {
        interface TestCase {
            input: {
                path: string;
            };
            output: boolean;
        }

        function runTest(testCase: TestCase) {
            // Inject
            const deps = emptyDeps<MountHelper>();

            // When
            const sut = new MountHelper(deps);
            const result = sut.isHttp(testCase.input.path);

            // Then
            expect(result).toBe(testCase.output);
        }

        test('definitely not a url', () => {
            runTest({
                input: {
                    path: 'notaurl',
                },
                output: false,
            });
        });

        test('http but not a url', () => {
            runTest({
                input: {
                    path: 'http:stillnotaurl',
                },
                output: false,
            });
        });

        test('url but not http', () => {
            runTest({
                input: {
                    path: 'ftp://thisisaurl',
                },
                output: false,
            });
        });

        test('is http', () => {
            runTest({
                input: {
                    path: 'http://thisisaurl',
                },
                output: true,
            });
        });

        test('is https', () => {
            runTest({
                input: {
                    path: 'https://thisisaurl',
                },
                output: true,
            });
        });
    });

    describe('toRelativePath', () => {
        interface TestCase {
            cwd: string;

            input: {
                path: string;
            };
            output: string;
        }

        function runTest(testCase: TestCase) {
            // Inject
            const deps = emptyDeps<MountHelper>();

            deps.process = new UnimplementedProcess();
            deps.process.cwd = () => testCase.cwd;

            deps.path = new NodePath();
            const origResolve = deps.path.resolve;
            deps.path.resolve = (...paths) => origResolve(testCase.cwd, ...paths);

            // When
            const sut = new MountHelper(deps);
            const result = sut.toRelativePath(testCase.input.path);

            // Then
            expect(result).toBe(testCase.output);
        }

        test('absolute to relative no change at root', () => {
            runTest({
                cwd: '/',

                input: {
                    path: '/foo/bar',
                },
                output: 'foo/bar',
            });
        });

        test('absolute to relative in subdir', () => {
            runTest({
                cwd: '/my/subdir',

                input: {
                    path: '/foo/bar',
                },
                output: '../../foo/bar',
            });
        });

        test('relative to relative no change', () => {
            runTest({
                cwd: '/my/subdir',

                input: {
                    path: 'foo/bar',
                },
                output: 'foo/bar',
            });
        });

        test('relative to relative collapses duplicates', () => {
            runTest({
                cwd: '/my/subdir',

                input: {
                    path: '../subdir/foo/bar',
                },
                output: 'foo/bar',
            });
        });
    });

    describe('isMountedUnderneath', () => {
        interface TestCase {
            input: {
                mounts: string[];
                dest: string;
            };
            output: boolean;
        }

        function runTest(testCase: TestCase) {
            // Inject
            const deps = emptyDeps<MountHelper>();

            deps.path = new NodePath();

            // When
            const sut = new MountHelper(deps);
            const result = sut.isMountedUnderneath(
                testCase.input.mounts,
                testCase.input.dest,
            );

            // Then
            expect(result).toBe(testCase.output);
        }

        test('no mounts', () => {
            runTest({
                input: {
                    mounts: [],
                    dest: '/foo/bar',
                },
                output: false,
            });
        });

        test('never mounted underneath - cousins', () => {
            runTest({
                input: {
                    mounts: [
                        '/first/location',
                        '/place/number/two',
                        '/the/third/spot',
                    ],
                    dest: '/not/underneath',
                },
                output: false,
            });
        });

        test('never mounted underneath - siblings', () => {
            runTest({
                input: {
                    mounts: [
                        '/first/location',
                        '/place/number/two',
                        '/the/third/spot',
                    ],
                    dest: '/not',
                },
                output: false,
            });
        });

        test('never mounted underneath - partial', () => {
            runTest({
                input: {
                    mounts: [
                        '/first/location',
                        '/place/number/two',
                        '/the/third/spot',
                    ],
                    dest: '/not/number/two',
                },
                output: false,
            });
        });

        test('never mounted underneath - parent', () => {
            runTest({
                input: {
                    mounts: [
                        '/first/location',
                        '/place/number/two',
                        '/the/third/spot',
                    ],
                    dest: '/place/number',
                },
                output: false,
            });
        });

        test('is mounted underneath - same', () => {
            runTest({
                input: {
                    mounts: [
                        '/first/location',
                        '/place/number/two',
                        '/the/third/spot',
                    ],
                    dest: '/place/number/two',
                },
                output: true,
            });
        });

        test('is mounted underneath - child', () => {
            runTest({
                input: {
                    mounts: [
                        '/first/location',
                        '/place/number/two',
                        '/the/third/spot',
                    ],
                    dest: '/place/number/two/underneath',
                },
                output: true,
            });
        });
    });

    describe('generateRandomName', () => {
        interface TestCase {
            len: number;
        }

        function runTest(testCase: TestCase) {
            // Inject
            const deps = emptyDeps<MountHelper>();

            // When
            const sut = new MountHelper(deps);
            const result = sut.generateRandomName(testCase.len);

            // Then
            expect(typeof result).toBe('string');
            expect(result).toHaveLength(testCase.len);
        }

        test('length 0', () => {
            runTest({
                len: 0,
            });
        });

        test('length 16', () => {
            runTest({
                len: 16,
            });
        });

        test('len 256', () => {
            runTest({
                len: 256,
            });
        });
    });

    describe('generateMountFilename', () => {
        async function runTest() {
            // Given
            const depFs = new InMemoryFs('/', {'.fm': {}});

            // Inject
            const deps = emptyDeps<MountHelper>();

            deps.fs = depFs;

            // When
            const sut = new MountHelper(deps);
            const result = await sut.generateMountFilename();

            // Then
            expect(typeof result).toBe('string');
            expect(result).toHaveLength(16);
        }
    });

    describe('writeMountRecord', () => {
        interface TestCase {
            before: {
                files: RawFiles;
            };
            after: {
                files: RawFiles;
            };

            input: {
                record: MountRecord;
                name: string;
            };
        }

        async function runTest(testCase: TestCase) {
            // Given
            const depFs = new InMemoryFs('/', testCase.before.files);

            // Inject
            const deps = emptyDeps<MountHelper>();

            deps.fs = depFs;

            // When
            const sut = new MountHelper(deps);
            await sut.writeMountRecord(
                testCase.input.record,
                testCase.input.name,
            );

            // Then
            expect(depFs.toRaw()).toEqual(testCase.after.files);
        }

        test('writes JSON to given file', async () => {
            await runTest({
                before: {
                    files: {
                        '.fm': {
                            '3.mount': 'I am number 3',
                        },
                    },
                },
                after: {
                    files: {
                        '.fm': {
                            '3.mount': 'I am number 3',
                            'new.mount': '{"dest":"mahna mahna","replaced":false}',
                        },
                    },
                },

                input: {
                    record: {
                        dest: 'mahna mahna',
                        replaced: false,
                    },
                    name: 'new',
                },
            });
        });
    });

    describe('readMountRecord', () => {
        interface TestCase {
            files: RawFiles;

            input: {
                name: string;
            };
            output: MountRecord;
        }

        async function runTest(testCase: TestCase) {
            // Given
            const depFs = new InMemoryFs('/', testCase.files);

            // Inject
            const deps = emptyDeps<MountHelper>();

            deps.fs = depFs;

            // When
            const sut = new MountHelper(deps);
            const result = await sut.readMountRecord(testCase.input.name);

            // Then
            expect(result).toEqual(testCase.output);
        }

        test('reads file by name', async () => {
            await runTest({
                files: {
                    '.fm': {
                        'something.mount': '{"dest":"mahna mahna","replaced":false}',
                    },
                },

                input: {
                    name: 'something',
                },
                output: {
                    dest: 'mahna mahna',
                    replaced: false,
                },
            });
        });
    });

    describe('downloadFile', async () => {
        interface TestCase {
            endpoints: Endpoints;

            before: {
                files: RawFiles;
            };
            after: {
                files: RawFiles;
            };

            input: {
                url: string;
                dest: string;
            };
        }

        async function runTest(testCase: TestCase) {
            // Given
            const depFs = new InMemoryFs('/', testCase.before.files);
            const depHttp = new StaticHttp(testCase.endpoints);

            // Inject
            const deps = emptyDeps<MountHelper>();

            deps.fs = depFs;
            deps.http = depHttp;
            // deps.path = new NodePath();

            // When
            const sut = new MountHelper(deps);
            await sut.downloadFile(
                testCase.input.url,
                testCase.input.dest,
            );

            // Then
            expect(depFs.toRaw()).toEqual(testCase.after.files);
        }

        test('downloads file from url', async () => {
            await runTest({
                endpoints: {
                    'http://my.site/file.txt': 'hello from the other side!',
                },
                before: {
                    files: {},
                },
                after: {
                    files: {
                        'newFile.txt': 'hello from the other side!',
                    },
                },
                input: {
                    url: 'http://my.site/file.txt',
                    dest: 'newFile.txt',
                },
            });
        });

        // test('downloads file from url to new folder path', async () => {
        //     await runTest({
        //         endpoints: {
        //             'http://my.site/file.txt': 'hello from the other side!',
        //         },
        //         before: {
        //             files: {},
        //         },
        //         after: {
        //             files: {
        //                 newFolder: {
        //                     'newFile.txt': 'hello from the other side!',
        //                 },
        //             },
        //         },
        //         input: {
        //             url: 'http://my.site/file.txt',
        //             dest: 'newFolder/newFile.txt',
        //         },
        //     });
        // });
    });
});
