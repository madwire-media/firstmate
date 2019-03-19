import { InMemoryFs, RawFiles } from '../../deps/fs/mocks/in-memory';
import { Endpoints, StaticHttp } from '../../deps/http/mocks/static';
import { NodePath } from '../../deps/path/impls/node';
import { UnimplementedProcess } from '../../deps/process/mocks/unimplemented';
import { emptyDeps } from '../../util/container/mock';
import { MountPrivate, MountRecord } from './private';

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
            const deps = emptyDeps<MountPrivate>();

            // When
            const sut = new MountPrivate(deps);
            const result = sut.isHttp(testCase.input.path);

            // Then
            expect(result).toBe(testCase.output);
        }

        test('"notaurl" -> false', () => {
            runTest({
                input: {
                    path: 'notaurl',
                },
                output: false,
            });
        });

        test('"http:stillnotaurl" -> false', () => {
            runTest({
                input: {
                    path: 'http:stillnotaurl',
                },
                output: false,
            });
        });

        test('"ftp://thisisaurl" -> true', () => {
            runTest({
                input: {
                    path: 'ftp://thisisaurl',
                },
                output: false,
            });
        });

        test('"http://thisisaurl" -> true', () => {
            runTest({
                input: {
                    path: 'http://thisisaurl',
                },
                output: true,
            });
        });

        test('"https://thisisaurl" -> true', () => {
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
            const deps = emptyDeps<MountPrivate>();

            deps.process = new UnimplementedProcess();
            deps.process.cwd = () => testCase.cwd;

            deps.path = new NodePath();
            const origResolve = deps.path.resolve;
            deps.path.resolve = (...paths) => origResolve(testCase.cwd, ...paths);

            // When
            const sut = new MountPrivate(deps);
            const result = sut.toRelativePath(testCase.input.path);

            // Then
            expect(result).toBe(testCase.output);
        }

        test('absolute path at root cwd -> removes initial /', () => {
            runTest({
                cwd: '/',

                input: {
                    path: '/foo/bar',
                },
                output: 'foo/bar',
            });
        });

        test('absolute path in subdir cwd -> adds traversal to common parent', () => {
            runTest({
                cwd: '/my/subdir',

                input: {
                    path: '/foo/bar',
                },
                output: '../../foo/bar',
            });
        });

        test('relative path -> no change', () => {
            runTest({
                cwd: '/my/subdir',

                input: {
                    path: 'foo/bar',
                },
                output: 'foo/bar',
            });
        });

        test('relative path with .. in subdir cwd -> collapses duplicates', () => {
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
            const deps = emptyDeps<MountPrivate>();

            deps.path = new NodePath();

            // When
            const sut = new MountPrivate(deps);
            const result = sut.isMountedUnderneath(
                testCase.input.mounts,
                testCase.input.dest,
            );

            // Then
            expect(result).toBe(testCase.output);
        }

        test('no preexisting mounts -> false', () => {
            runTest({
                input: {
                    mounts: [],
                    dest: '/foo/bar',
                },
                output: false,
            });
        });

        test('new mount is cousin to existing mounts -> false', () => {
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

        test('new mount is sibling to existing mounts -> false', () => {
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

        test('new mount is cousin to existing mounts with similar subpaths -> false', () => {
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

        test('new mount is parent to existing mounts -> false', () => {
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

        test('new mount duplicates existing mount -> true', () => {
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

        test('new mount is child to existing mount -> true', () => {
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
            const deps = emptyDeps<MountPrivate>();

            // When
            const sut = new MountPrivate(deps);
            const result = sut.generateRandomName(testCase.len);

            // Then
            expect(typeof result).toBe('string');
            expect(result).toHaveLength(testCase.len);
        }

        test('generates string of 0 chars', () => {
            runTest({
                len: 0,
            });
        });

        test('generates string of 16 chars', () => {
            runTest({
                len: 16,
            });
        });

        test('generates string of 0 chars', () => {
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
            const deps = emptyDeps<MountPrivate>();

            deps.fs = depFs;

            // When
            const sut = new MountPrivate(deps);
            const result = await sut.generateMountFilename();

            // Then
            expect(typeof result).toBe('string');
            expect(result).toHaveLength(16);
        }

        test('generates string of 16 chars', async () => {
            await runTest();
        });
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
            const deps = emptyDeps<MountPrivate>();

            deps.fs = depFs;

            // When
            const sut = new MountPrivate(deps);
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
            const deps = emptyDeps<MountPrivate>();

            deps.fs = depFs;

            // When
            const sut = new MountPrivate(deps);
            const result = await sut.readMountRecord(testCase.input.name);

            // Then
            expect(result).toEqual(testCase.output);
        }

        test('reads file by given name', async () => {
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

    describe('downloadFile', () => {
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
            const deps = emptyDeps<MountPrivate>();

            deps.fs = depFs;
            deps.http = depHttp;
            deps.path = new NodePath();

            // When
            const sut = new MountPrivate(deps);
            await sut.downloadFile(
                testCase.input.url,
                testCase.input.dest,
            );

            // Then
            expect(depFs.toRaw()).toEqual(testCase.after.files);
        }

        test('downloads contents from url and saves into given file', async () => {
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

        test('downloads contents from url and saves into given file, creating dirs when needed', async () => {
            await runTest({
                endpoints: {
                    'http://my.site/file.txt': 'hello from the other side!',
                },
                before: {
                    files: {},
                },
                after: {
                    files: {
                        newFolder: {
                            'newFile.txt': 'hello from the other side!',
                        },
                    },
                },
                input: {
                    url: 'http://my.site/file.txt',
                    dest: 'newFolder/newFile.txt',
                },
            });
        });
    });

    describe('hasDotFm', () => {
        interface TestCase {
            before: {
                files: RawFiles;
            };
            output: boolean;
        }

        async function runTest(testCase: TestCase) {
            // Given
            const depFs = new InMemoryFs('/', testCase.before.files);

            // Inject
            const deps = emptyDeps<MountPrivate>();

            deps.fs = depFs;

            // When
            const sut = new MountPrivate(deps);
            const result = await sut.hasDotFm();

            // Then
            expect(result).toBe(testCase.output);
        }

        test('returns true when .fm is a directory', async () => {
            await runTest({
                before: {
                    files: {
                        '.fm': {},
                    },
                },
                output: true,
            });
        });

        test('returns false when .fm is not a directory', async () => {
            await runTest({
                before: {
                    files: {
                        '.fm': 'this is a file',
                    },
                },
                output: false,
            });
        });

        test('returns false when .fm does not exist', async () => {
            await runTest({
                before: {
                    files: {},
                },
                output: false,
            });
        });
    });

    describe('ensureDotFm', () => {
        interface TestCase {
            before: {
                files: RawFiles;
            };
            after: {
                files: RawFiles;
            };
        }

        async function runTest(testCase: TestCase) {
            // Given
            const depFs = new InMemoryFs('/', testCase.before.files);

            // Inject
            const deps = emptyDeps<MountPrivate>();

            deps.fs = depFs;

            // When
            const sut = new MountPrivate(deps);
            await sut.ensureDotFm();

            // Then
            expect(depFs.toRaw()).toEqual(testCase.after.files);
        }

        test('does nothing when .fm is a directory', async () => {
            await runTest({
                before: {
                    files: {
                        '.fm': {},
                    },
                },
                after: {
                    files: {
                        '.fm': {},
                    },
                },
            });
        });

        test('deletes and creates directory when .fm is not a directory', async () => {
            await runTest({
                before: {
                    files: {
                        '.fm': 'this is a file',
                    },
                },
                after: {
                    files: {
                        '.fm': {},
                    },
                },
            });
        });

        test('creates directory when .fm does not exist', async () => {
            await runTest({
                before: {
                    files: {},
                },
                after: {
                    files: {
                        '.fm': {},
                    },
                },
            });
        });
    });
});
