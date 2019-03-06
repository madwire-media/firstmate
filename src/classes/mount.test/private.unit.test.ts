import { Readable, Writable } from 'stream';
import { FsError, Stats } from '../../deps/fs';
import { UnimplementedFs } from '../../deps/fs/mocks/unimplemented';
import { UnimplementedHttp, UnimplementedHttpRequest, UnimplementedHttpResponse } from '../../deps/http/mocks/unimplemented';
import { UnimplementedPath } from '../../deps/path/mocks/unimplemented';
import { UnimplementedProcess } from '../../deps/process/mocks/unimplemented';
import { cases, emptyDeps, unimplemented } from '../../util/container/mock';
import { MountHelper, MountRecord } from '../mount.private';

describe('mount subsystem private method unit tests', () => {
    describe('isHttp', () => {
        // isHttp is so simple that its unit tests are its functional tests

        test('is not a url', () => {
            // Given
            const source = 'not.a/url';

            // Inject
            const deps = emptyDeps<MountHelper>();

            // When
            const sut = new MountHelper(deps);
            const result = sut.isHttp(source);

            // Then
            expect(result).toBe(false);
        });

        test('is a url - http', () => {
            // Given
            const source = 'http://is.a/url';

            // Inject
            const deps = emptyDeps<MountHelper>();

            // When
            const sut = new MountHelper(deps);
            const result = sut.isHttp(source);

            // Then
            expect(result).toBe(true);
        });

        test('is a url - https', () => {
            // Given
            const source = 'https://is.a/url';

            // Inject
            const deps = emptyDeps<MountHelper>();

            // When
            const sut = new MountHelper(deps);
            const result = sut.isHttp(source);

            // Then
            expect(result).toBe(true);
        });
    });

    describe('toRelativePath', () => {
        test('works', () => {
            // Given
            const input = '/absolute/path';

            const fnProcessCwd = jest.fn(() => '/my/subdir');
            const fnPathResolve = jest.fn(
                cases([
                    [['/absolute/path'], '/absolute/path'],
                ]),
            );
            const fnPathRelative = jest.fn(
                cases([
                    [['/my/subdir', '/absolute/path'], '../../absolute/path'],
                ]),
            );

            // Inject
            const deps = emptyDeps<MountHelper>();

            deps.process = new UnimplementedProcess();
            deps.process.cwd = fnProcessCwd;

            deps.path = new UnimplementedPath();
            deps.path.resolve = fnPathResolve;
            deps.path.relative = fnPathRelative;

            // When
            const sut = new MountHelper(deps);
            const result = sut.toRelativePath(input);

            // Then
            expect(result).toBe('../../absolute/path');

            expect(fnProcessCwd).toBeCalled();
            expect(fnPathResolve).toBeCalled();
            expect(fnPathRelative).toBeCalled();
        });
    });

    describe('isMountedUnderneath', () => {
        test('no mounts', () => {
            // Given
            const mounts: any[] = [];
            const dest = '/foo/bar';

            const fnPathRelative = jest.fn();
            const fnPathDirname = jest.fn();

            // Inject
            const deps = emptyDeps<MountHelper>();

            // When
            const sut = new MountHelper(deps);
            const result = sut.isMountedUnderneath(mounts, dest);

            // Then
            expect(result).toBe(false);

            expect(fnPathRelative).not.toHaveBeenCalled();
            expect(fnPathDirname).not.toHaveBeenCalled();
        });

        test('never mounted underneath - cousins', () => {
            // Given
            const mounts = [
                '/first/location',
                '/place/number/two',
                '/the/third/spot',
            ];
            const dest = '/not/underneath';

            const fnPathRelative = jest.fn(
                cases([
                    [['/not/underneath', '/first/location'], '../first/location'],
                    [['/not/underneath', '/place/number/two'], '../place/number/two'],
                    [['/not/underneath', '/the/third/spot'], '../the/third/spot'],
                ]),
            );

            // Inject
            const deps = emptyDeps<MountHelper>();

            deps.path = new UnimplementedPath();
            deps.path.relative = fnPathRelative;

            // When
            const sut = new MountHelper(deps);
            const result = sut.isMountedUnderneath(mounts, dest);

            // Then
            expect(result).toBe(false);

            expect(fnPathRelative).toHaveBeenCalledTimes(3);
            expect(fnPathRelative).toHaveBeenCalledWith('/not/underneath', '/first/location');
            expect(fnPathRelative).toHaveBeenCalledWith('/not/underneath', '/place/number/two');
            expect(fnPathRelative).toHaveBeenCalledWith('/not/underneath', '/the/third/spot');
        });

        test('never mounted underneath - siblings', () => {
            // Given
            const mounts = [
                '/first/location',
                '/place/number/two',
                '/the/third/spot',
            ];
            const dest = '/not';

            const fnPathRelative = jest.fn(
                cases([
                    [['/not', '/first/location'], 'first/location'],
                    [['/not', '/place/number/two'], 'place/number/two'],
                    [['/not', '/the/third/spot'], 'the/third/spot'],
                ]),
            );

            // Inject
            const deps = emptyDeps<MountHelper>();

            deps.path = new UnimplementedPath();
            deps.path.relative = fnPathRelative;

            // When
            const sut = new MountHelper(deps);
            const result = sut.isMountedUnderneath(mounts, dest);

            // Then
            expect(result).toBe(false);

            expect(fnPathRelative).toHaveBeenCalledTimes(3);
            expect(fnPathRelative).toHaveBeenCalledWith('/not', '/first/location');
            expect(fnPathRelative).toHaveBeenCalledWith('/not', '/place/number/two');
            expect(fnPathRelative).toHaveBeenCalledWith('/not', '/the/third/spot');
        });

        test('is mounted underneath - same', () => {
            // Given
            const mounts = [
                '/first/location',
                '/place/number/two',
                '/the/third/spot',
            ];
            const dest = '/place/number/two';

            const fnPathRelative = jest.fn(
                cases([
                    [['/place/number/two', '/first/location'], '../../../first/location'],
                    [['/place/number/two', '/place/number/two'], ''],
                    [['/place/number/two', '/the/third/spot'], '../../../the/third/spot'],
                ]),
            );

            // Inject
            const deps = emptyDeps<MountHelper>();

            deps.path = new UnimplementedPath();
            deps.path.relative = fnPathRelative;

            // When
            const sut = new MountHelper(deps);
            const result = sut.isMountedUnderneath(mounts, dest);

            // Then
            expect(result).toBe(true);

            expect(fnPathRelative).toHaveBeenCalledWith('/place/number/two', '/place/number/two');
        });

        test('is mounted underneath - child', () => {
            // Given
            const mounts = [
                '/first/location',
                '/place/number/two',
                '/the/third/spot',
            ];
            const dest = '/place/number/two/underneath';

            const fnPathRelative = jest.fn(
                cases([
                    [['/place/number/two/underneath', '/first/location'], '../../../../first/location'],
                    [['/place/number/two/underneath', '/place/number/two'], '..'],
                    [['/place/number/two/underneath', '/the/third/spot'], '../../../../first/location'],
                ]),
            );

            // Inject
            const deps = emptyDeps<MountHelper>();

            deps.path = new UnimplementedPath();
            deps.path.relative = fnPathRelative;

            // When
            const sut = new MountHelper(deps);
            const result = sut.isMountedUnderneath(mounts, dest);

            // Then
            expect(result).toBe(true);

            expect(fnPathRelative).toHaveBeenCalledWith('/place/number/two/underneath', '/place/number/two');
        });
    });

    describe('generateRandomName', () => {
        test('works', () => {
            // Given
            const len = 16;

            // Inject
            const deps = emptyDeps<MountHelper>();

            // When
            const sut = new MountHelper(deps);
            const result = sut.generateRandomName(len);

            // Then
            expect(typeof result).toBe('string');
            expect(result).toHaveLength(16);
        });
    });

    describe('generateMountFilename', () => {
        test('generates name', async () => {
            // Given
            const fnFsExists = jest.fn(() => Promise.resolve(false));

            // Inject
            const deps = emptyDeps<MountHelper>();

            deps.fs = new UnimplementedFs();
            deps.fs.exists = fnFsExists;

            // When
            const sut = new MountHelper(deps);
            const result = await sut.generateMountFilename();

            // Then
            expect(typeof result).toBe('string');
            expect(result).toHaveLength(16);
        });

        test('generates unique name', async () => {
            // Captures
            const existingFiles: string[] = [];

            // Given
            const fnFsExists = jest.fn((path: string) => {
                if (existingFiles.length < 2) {
                    existingFiles.push(path.substr(4));

                    return Promise.resolve(true);
                } else {
                    return Promise.resolve(false);
                }
            });

            // Inject
            const deps = emptyDeps<MountHelper>();

            deps.fs = new UnimplementedFs();
            deps.fs.exists = fnFsExists;

            // When
            const sut = new MountHelper(deps);
            const result = await sut.generateMountFilename();

            // Then
            expect(typeof result).toBe('string');
            expect(result).toHaveLength(16);

            expect(existingFiles).not.toContain(result);
            expect(existingFiles).toHaveLength(2);
        });
    });

    describe('writeMountRecord', () => {
        test('works', async () => {
            // Given
            const record: MountRecord = {
                dest: 'my/destination',
                replaced: false,
            };
            const name = 'my-record';

            const fnFsWrite = jest.fn();

            // Inject
            const deps = emptyDeps<MountHelper>();

            deps.fs = new UnimplementedFs();
            deps.fs.write = fnFsWrite;

            // When
            const sut = new MountHelper(deps);
            const result = await sut.writeMountRecord(record, name);

            // Then
            expect(result).toBe(undefined);

            expect(fnFsWrite).toHaveBeenCalledTimes(1);
            expect(fnFsWrite).toHaveBeenCalledWith(
                '.fm/my-record.mount',
                '{"dest":"my/destination","replaced":false}',
            );
        });
    });

    describe('readMountRecord', () => {
        test('works', async () => {
            // Given
            const name = 'other-record';

            const fnFsRead = jest.fn(
                () => Promise.resolve('{"dest":"other/destination","replaced":false}'),
            );

            // Inject
            const deps = emptyDeps<MountHelper>();

            deps.fs = new UnimplementedFs();
            deps.fs.read = fnFsRead;

            // When
            const sut = new MountHelper(deps);
            const result = await sut.readMountRecord(name);

            // Then
            expect(result).toEqual({
                dest: 'other/destination',
                replaced: false,
            });

            expect(fnFsRead).toHaveBeenCalledTimes(1);
            expect(fnFsRead).toHaveBeenCalledWith('.fm/other-record.mount');
        });
    });

    describe('downloadFile', () => {
        test('works', async () => {
            // Captures
            let writtenData = '';

            // Given
            const url = 'http://hello.world';
            const dest = 'hello/world';

            const fnHttpGetRead = jest.fn(function(this: Readable) {
                this.push('contents of web file');
                this.push(null);
            });
            const fnHttpGetResponse = jest.fn(() => {
                const response = new UnimplementedHttpResponse();

                response._read = fnHttpGetRead;

                return response;
            });
            const fnHttpGet = jest.fn(() => {
                const request = new UnimplementedHttpRequest();

                request.getResponse = fnHttpGetResponse;

                return request;
            });

            const fnFsCreateWriteStreamWrite = jest.fn((chunk: any, encoding, cb: () => void) => {
                writtenData += chunk.toString();
                cb();
            });
            const fnFsCreateWriteStreamFinal = jest.fn((cb: () => void) => cb());
            const fnFsCreateWriteStream = jest.fn(() => {
                return new Writable({
                    write: fnFsCreateWriteStreamWrite,
                    final: fnFsCreateWriteStreamFinal,
                });
            });

            // Inject
            const deps = emptyDeps<MountHelper>();

            deps.http = new UnimplementedHttp();
            deps.http.get = fnHttpGet;

            deps.fs = new UnimplementedFs();
            deps.fs.createWriteStream = fnFsCreateWriteStream;

            // When
            const sut = new MountHelper(deps);
            const result = await sut.downloadFile(url, dest);

            // Then
            expect(result).toBe(undefined);

            expect(writtenData).toBe('contents of web file');

            expect(fnHttpGet).toBeCalledTimes(1);
            expect(fnHttpGetResponse).toBeCalledTimes(1);
            expect(fnHttpGetRead).toBeCalled();

            expect(fnFsCreateWriteStream).toBeCalledTimes(1);
            expect(fnFsCreateWriteStream).toBeCalledWith('hello/world');
            expect(fnFsCreateWriteStreamWrite).toBeCalled();
            expect(fnFsCreateWriteStreamFinal).toBeCalledTimes(1);
        });
    });

    describe('getMountIds', () => {
        test('works', async () => {
            // Given
            const fnFsReaddir = jest.fn(() => Promise.resolve([
                '3.mount', '.mount', '1.mount', 'hello.world', '5.mount',
            ]));

            // Inject
            const deps = emptyDeps<MountHelper>();

            deps.fs = new UnimplementedFs();
            deps.fs.readdir = fnFsReaddir;

            // When
            const sut = new MountHelper(deps);
            const result = await sut.getMountIds();

            // Then
            expect(result).toEqual([1, 3, 5]);

            expect(fnFsReaddir).toBeCalledTimes(1);
            expect(fnFsReaddir).toBeCalledWith('.fm');
        });
    });

    describe('hasDotFm', () => {
        test('returns true when .fm is a directory', async () => {
            // Given
            const fnFsStatIsDirectory = jest.fn(() => true);
            const fnFsStat = jest.fn((): Promise<Stats> => {
                return Promise.resolve({
                    getMode: unimplemented,
                    isDirectory: fnFsStatIsDirectory,
                });
            });

            // Inject
            const deps = emptyDeps<MountHelper>();

            deps.fs = new UnimplementedFs();
            deps.fs.stat = fnFsStat;

            // When
            const sut = new MountHelper(deps);
            const result = await sut.hasDotFm();

            // Then
            expect(result).toBe(true);

            expect(fnFsStat).toBeCalledTimes(1);
            expect(fnFsStat).toBeCalledWith('.fm');

            expect(fnFsStatIsDirectory).toBeCalled();
        });

        test('returns false when .fm is not a directory', async () => {
            // Given
            const fnFsStatIsDirectory = jest.fn(() => false);
            const fnFsStat = jest.fn((): Promise<Stats> => {
                return Promise.resolve({
                    getMode: unimplemented,
                    isDirectory: fnFsStatIsDirectory,
                });
            });

            // Inject
            const deps = emptyDeps<MountHelper>();

            deps.fs = new UnimplementedFs();
            deps.fs.stat = fnFsStat;

            // When
            const sut = new MountHelper(deps);
            const result = await sut.hasDotFm();

            // Then
            expect(result).toBe(false);

            expect(fnFsStat).toBeCalledTimes(1);
            expect(fnFsStat).toBeCalledWith('.fm');

            expect(fnFsStatIsDirectory).toBeCalled();
        });

        test('returns false when .fm does not exist', async () => {
            // Given
            const fnFsStat = jest.fn((): Promise<Stats> => {
                return Promise.reject(new FsError({
                    message: 'ooo eee, oo ah ah ting tang',
                    code: 'ENOENT',
                }));
            });

            // Inject
            const deps = emptyDeps<MountHelper>();

            deps.fs = new UnimplementedFs();
            deps.fs.stat = fnFsStat;

            // When
            const sut = new MountHelper(deps);
            const result = await sut.hasDotFm();

            // Then
            expect(result).toBe(false);

            expect(fnFsStat).toBeCalledTimes(1);
            expect(fnFsStat).toBeCalledWith('.fm');
        });

        test('throws error on other fs error', async () => {
            // Given
            const fnFsStat = jest.fn((): Promise<Stats> => {
                return Promise.reject(new Error(
                    'walla walla bing bang',
                ));
            });

            // Inject
            const deps = emptyDeps<MountHelper>();

            deps.fs = new UnimplementedFs();
            deps.fs.stat = fnFsStat;

            // When
            const sut = new MountHelper(deps);
            await expect(sut.hasDotFm()).rejects.toThrowError('walla walla bing bang');

            // Then
            expect(fnFsStat).toBeCalledTimes(1);
            expect(fnFsStat).toBeCalledWith('.fm');
        });
    });

    describe('ensureDotFm', () => {
        test('does nothing when .fm is a directory', async () => {
            // Given
            const fnFsStatIsDirectory = jest.fn(() => true);
            const fnFsStat = jest.fn((): Promise<Stats> => {
                return Promise.resolve({
                    getMode: unimplemented,
                    isDirectory: fnFsStatIsDirectory,
                });
            });

            // Inject
            const deps = emptyDeps<MountHelper>();

            deps.fs = new UnimplementedFs();
            deps.fs.stat = fnFsStat;

            // When
            const sut = new MountHelper(deps);
            const result = await sut.ensureDotFm();

            // Then
            expect(result).toBe(undefined);

            expect(fnFsStat).toBeCalledTimes(1);
            expect(fnFsStat).toBeCalledWith('.fm');

            expect(fnFsStatIsDirectory).toBeCalled();
        });

        test('deletes and creates directory when .fm is not a directory', async () => {
            // Given
            const fnFsStatIsDirectory = jest.fn(() => false);
            const fnFsStat = jest.fn((): Promise<Stats> => {
                return Promise.resolve({
                    getMode: unimplemented,
                    isDirectory: fnFsStatIsDirectory,
                });
            });
            const fnFsRemove = jest.fn();
            const fnFsMkdir = jest.fn();

            // Inject
            const deps = emptyDeps<MountHelper>();

            deps.fs = new UnimplementedFs();
            deps.fs.stat = fnFsStat;
            deps.fs.remove = fnFsRemove;
            deps.fs.mkdir = fnFsMkdir;

            // When
            const sut = new MountHelper(deps);
            const result = await sut.ensureDotFm();

            // Then
            expect(result).toBe(undefined);

            expect(fnFsStat).toBeCalledTimes(1);
            expect(fnFsStat).toBeCalledWith('.fm');

            expect(fnFsRemove).toBeCalledTimes(1);
            expect(fnFsRemove).toBeCalledWith('.fm');

            expect(fnFsMkdir).toBeCalledTimes(1);
            expect(fnFsMkdir).toBeCalledWith('.fm');
        });

        test('creates directory when .fm does not exist', async () => {
            // Given
            const fnFsStat = jest.fn((): Promise<Stats> => {
                return Promise.reject(new FsError({
                    message: 'ooo eee, oo ah ah ting tang',
                    code: 'ENOENT',
                }));
            });
            const fnFsMkdirp = jest.fn();

            // Inject
            const deps = emptyDeps<MountHelper>();

            deps.fs = new UnimplementedFs();
            deps.fs.stat = fnFsStat;
            deps.fs.mkdirp = fnFsMkdirp;

            // When
            const sut = new MountHelper(deps);
            const result = await sut.ensureDotFm();

            // Then
            expect(result).toBe(undefined);

            expect(fnFsStat).toBeCalledTimes(1);
            expect(fnFsStat).toBeCalledWith('.fm');

            expect(fnFsMkdirp).toBeCalledTimes(1);
            expect(fnFsMkdirp).toBeCalledWith('.fm');
        });

        test('throws error on other fs error', async () => {
            // Given
            const fnFsStat = jest.fn((): Promise<Stats> => {
                return Promise.reject(new Error(
                    'walla walla bing bang',
                ));
            });

            // Inject
            const deps = emptyDeps<MountHelper>();

            deps.fs = new UnimplementedFs();
            deps.fs.stat = fnFsStat;

            // When
            const sut = new MountHelper(deps);
            await expect(sut.ensureDotFm()).rejects.toThrowError('walla walla bing bang');

            // Then
            expect(fnFsStat).toBeCalledTimes(1);
            expect(fnFsStat).toBeCalledWith('.fm');
        });
    });
});
