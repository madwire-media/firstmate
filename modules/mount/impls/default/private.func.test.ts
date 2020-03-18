import type {} from 'mocha';

import { emptyDeps } from '@madwire-media/di-container';
import { expect } from '@madwire-media/expect';

import { StaticHttp, Endpoints } from '@madwire-media/http/mocks/static';
import { InMemoryFs, RawFiles } from '@madwire-media/fs-in-memory';

import { MountPrivateImpl } from './private';

// Warm up the JIT?
before(async () => {
    const coldFs = new InMemoryFs('/');

    await coldFs.mkdirp('foo/bar');
});

describe('mount/impls/default/private (functional)', () => {
    describe('downloadFile', () => {
        interface TestCase {
            static: {
                endpoints: Endpoints;
            };

            before: {
                files: RawFiles;
            };
            after: {
                files: RawFiles;
            };

            args: {
                url: string;
                dest: string;
            };
        }

        async function runTest(testCase: TestCase) {
            // Given
            const depFs = new InMemoryFs('/', testCase.before.files);
            const depHttp = new StaticHttp(testCase.static.endpoints);

            // Inject
            const deps = emptyDeps<MountPrivateImpl>();

            deps.fs = depFs;
            deps.http = depHttp;

            // When
            const sut = new MountPrivateImpl(deps);
            const result = await sut.downloadFile(
                testCase.args.url,
                testCase.args.dest,
            );

            // Then
            expect(result).toBeOk();
            expect(depFs.toRaw()).toEqual(testCase.after.files);
        }

        it('downloads file to disk', () => runTest({
            static: {
                endpoints: {
                    'http://my.site/file.txt': 'hello from the other side!',
                },
            },

            before: {
                files: {},
            },
            after: {
                files: {
                    'newFile.txt': 'hello from the other side!',
                },
            },

            args: {
                url: 'http://my.site/file.txt',
                dest: 'newFile.txt',
            },
        }));

        it('creates parent directories and downloads file to disk', () => runTest({
            static: {
                endpoints: {
                    'http://my.site/file.txt': 'hello from the other side!',
                },
            },

            before: {
                files: {},
            },
            after: {
                files: {
                    foo: {
                        bar: {
                            'newFile.txt': 'hello from the other side!',
                        },
                    },
                },
            },

            args: {
                url: 'http://my.site/file.txt',
                dest: 'foo/bar/newFile.txt',
            },
        }));
    });
});
