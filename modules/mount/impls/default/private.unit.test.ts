import type {} from 'mocha';

import { emptyDeps } from '@madwire-media/di-container';
import { expect, mock } from '@madwire-media/expect';
import { Result } from '@madwire-media/result';
import { Readable, Writable } from 'stream';

import { UnimplementedHttpResponse, UnimplementedHttpRequest, UnimplementedHttp } from '@madwire-media/http/mocks/unimplemented';
import { UnimplementedFs } from '@madwire-media/fs/mocks/unimplemented';
import { UnimplementedCacheHandle } from '../../../tmpfs/mock';

import { MountPrivateImpl } from './private';
import { MountRecord } from './types';

describe('mount/impls/default/private (unit)', () => {
    describe('isHttp', () => {
        it('returns false when string is not a url', () => {
            // Given
            const source = 'missing.a/protocol';

            // Inject
            const deps = emptyDeps<MountPrivateImpl>();

            // When
            const sut = new MountPrivateImpl(deps);
            const result = sut.isHttp(source);

            // Then
            expect(result).toBeFalse();
        });

        it('returns true when string starts with http://', () => {
            // Given
            const source = 'http://is.a/url';

            // Inject
            const deps = emptyDeps<MountPrivateImpl>();

            // When
            const sut = new MountPrivateImpl(deps);
            const result = sut.isHttp(source);

            // Then
            expect(result).toBeTrue();
        });

        it('returns true when string starts with https://', () => {
            // Given
            const source = 'https://is.a/url';

            // Inject
            const deps = emptyDeps<MountPrivateImpl>();

            // When
            const sut = new MountPrivateImpl(deps);
            const result = sut.isHttp(source);

            // Then
            expect(result).toBeTrue();
        });
    });

    describe('isMountedUnderneath', () => {
        it('returns false when there are no preexisting mounts', () => {
            // Given
            const mounts: [] = [];
            const dest = '/foo/bar/';

            // Inject
            const deps = emptyDeps<MountPrivateImpl>();

            // When
            const sut = new MountPrivateImpl(deps);
            const result = sut.isMountedUnderneath(mounts, dest);

            // Then
            expect(result).toBeFalse();
        });

        it('returns false when new mount is cousin to others', () => {
            // Given
            const mounts = [
                '/first/location',
                '/place/number/two',
                '/the/third/spot',
            ];
            const dest = '/not/underneath';

            // Inject
            const deps = emptyDeps<MountPrivateImpl>();

            // When
            const sut = new MountPrivateImpl(deps);
            const result = sut.isMountedUnderneath(mounts, dest);

            // Then
            expect(result).toBeFalse();
        });

        it('returns false when new mount is sibling to others', () => {
            // Given
            const mounts = [
                '/first/location',
                '/place/number/two',
                '/the/third/spot',
            ];
            const dest = '/not';

            // Inject
            const deps = emptyDeps<MountPrivateImpl>();

            // When
            const sut = new MountPrivateImpl(deps);
            const result = sut.isMountedUnderneath(mounts, dest);

            // Then
            expect(result).toBeFalse();
        });

        it('returns true when new mount duplicates existing mount', () => {
            // Given
            const mounts = [
                '/first/location',
                '/place/number/two',
                '/the/third/spot',
            ];
            const dest = '/place/number/two';

            // Inject
            const deps = emptyDeps<MountPrivateImpl>();

            // When
            const sut = new MountPrivateImpl(deps);
            const result = sut.isMountedUnderneath(mounts, dest);

            // Then
            expect(result).toBeTrue();
        });

        it('returns true when the new mount is a child of an existing mount', () => {
            // Given
            const mounts = [
                '/first/location',
                '/place/number/two',
                '/the/third/spot',
            ];
            const dest = '/place/number/two/underneath';

            // Inject
            const deps = emptyDeps<MountPrivateImpl>();

            // When
            const sut = new MountPrivateImpl(deps);
            const result = sut.isMountedUnderneath(mounts, dest);

            // Then
            expect(result).toBeTrue();
        });
    });

    describe('writeMountRecord', () => {
        it('calls tmpfs.writeFile with JSON version of mount record', async () => {
            // Given
            const record: MountRecord = {
                dest: 'some/file',
                replaced: false,
            };
            const recordStr = JSON.stringify(record);
            const name = '1';

            const fnTmpFsHandleWriteFile = mock.fn(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                (_name: string, _json: string) => Promise.resolve(Result.voidOk),
            );

            // Inject
            const deps = emptyDeps<MountPrivateImpl>();

            deps.cacheHandle = new UnimplementedCacheHandle('mount private');
            deps.cacheHandle.writeFile = fnTmpFsHandleWriteFile;

            // When
            const sut = new MountPrivateImpl(deps);
            const result = await sut.writeMountRecord(record, name);

            // Then
            expect(result).toBeOk();

            expect(fnTmpFsHandleWriteFile).wasCalled().once().withArgs([name, recordStr]);
        });
    });

    describe('readMountRecord', () => {
        it('calls tmpfs.readFile and parses JSON record', async () => {
            // Given
            const record: MountRecord = {
                dest: 'some/file',
                replaced: false,
            };
            const recordStr = JSON.stringify(record);
            const name = '1';

            const fnTmpFsHandleReadFile = mock.fn(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                (_name: string) => Promise.resolve(Result.Ok(recordStr)),
            );

            // Inject
            const deps = emptyDeps<MountPrivateImpl>();

            deps.cacheHandle = new UnimplementedCacheHandle('mount private');
            deps.cacheHandle.readFile = fnTmpFsHandleReadFile;

            // When
            const sut = new MountPrivateImpl(deps);
            const result = await sut.readMountRecord(name);

            // Then
            expect(result).toBeOk();

            expect(fnTmpFsHandleReadFile).wasCalled().once();
            expect(fnTmpFsHandleReadFile.mock.calls[0].args).toEqual([name]);
        });

        it('returns Result.Err on invalid JSON', async () => {
            // Given
            const recordStr = 'this is not json';
            const name = '1';

            const fnTmpFsHandleReadFile = mock.fn(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                (_name: string) => Promise.resolve(Result.Ok(recordStr)),
            );

            // Inject
            const deps = emptyDeps<MountPrivateImpl>();

            deps.cacheHandle = new UnimplementedCacheHandle('mount private');
            deps.cacheHandle.readFile = fnTmpFsHandleReadFile;

            // When
            const sut = new MountPrivateImpl(deps);
            const result = await sut.readMountRecord(name);

            // Then
            expect(result).toBeErr();

            expect(fnTmpFsHandleReadFile).wasCalled().once();
            expect(fnTmpFsHandleReadFile.mock.calls[0].args).toEqual([name]);
        });
    });

    describe('deleteMountRecord', () => {
        it('deletes mount file if it exists', async () => {
            // Given
            const name = '1';

            const fnTmpFsHandleDeleteFileIfExists = mock.fn(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                (_name: string) => Promise.resolve(Result.voidOk),
            );

            // Inject
            const deps = emptyDeps<MountPrivateImpl>();

            deps.cacheHandle = new UnimplementedCacheHandle('mount private');
            deps.cacheHandle.deleteFileIfExists = fnTmpFsHandleDeleteFileIfExists;

            // When
            const sut = new MountPrivateImpl(deps);
            const result = await sut.deleteMountRecord(name);

            // Then
            expect(result).toBeOk();

            expect(fnTmpFsHandleDeleteFileIfExists).wasCalled().once().withArgs([name]);
        });
    });

    describe('getMountRecords', () => {
        it('lists files using given tmpfs handle', async () => {
            // Given
            const files = ['foo', 'bar.txt', 'some/random/file.name.thingy'];

            const fnTmpFsHandleListFiles = mock.fn(
                () => Result.promise.Ok(files),
            );

            // Inject
            const deps = emptyDeps<MountPrivateImpl>();

            deps.cacheHandle = new UnimplementedCacheHandle('mount private');
            deps.cacheHandle.listFiles = fnTmpFsHandleListFiles;

            // When
            const sut = new MountPrivateImpl(deps);
            const result = await sut.getMountRecords();

            // Then
            expect(result).toBeOk().andUnwrap.toBe(files);

            expect(fnTmpFsHandleListFiles).wasCalled().once();
        });
    });

    describe('downloadFile', () => {
        it('downloads file to disk', async () => {
            // Captures
            let writtenData = '';

            // Given
            const url = 'http://hello.world';
            const dest = 'helloWorld.txt';
            const contents = 'contents of web file';

            const fnHttpGetRead = mock.fn(function httpGetRead(this: Readable) {
                this.push(contents);
                this.push(null);
            });
            const fnHttpGetResponse = mock.fn(() => {
                const response = new UnimplementedHttpResponse();

                // eslint-disable-next-line no-underscore-dangle
                response._read = fnHttpGetRead;

                return response;
            });
            const fnHttpGet = mock.fn(() => {
                const request = new UnimplementedHttpRequest();

                request.getResponse = fnHttpGetResponse;

                return request;
            });

            const fnFsCreateWriteStreamWrite = mock.fn(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (chunk: any, _encoding, cb: () => void) => {
                    writtenData += chunk.toString();
                    cb();
                },
            );
            const fnFsCreateWriteStreamFinal = mock.fn((cb: () => void) => cb());
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const fnFsCreateWriteStream = mock.fn((_file: string) => Result.Ok(
                new Writable({
                    write: fnFsCreateWriteStreamWrite,
                    final: fnFsCreateWriteStreamFinal,
                }),
            ));
            const fnFsExists = mock.fn(() => Promise.resolve(true));

            // Inject
            const deps = emptyDeps<MountPrivateImpl>();

            deps.http = new UnimplementedHttp();
            deps.http.get = fnHttpGet;

            deps.fs = new UnimplementedFs();
            deps.fs.createWriteStream = fnFsCreateWriteStream;
            deps.fs.exists = fnFsExists;

            // When
            const sut = new MountPrivateImpl(deps);
            const result = await sut.downloadFile(url, dest);

            // Then
            expect(result).toBeOk();

            expect(writtenData).toBe(contents);

            expect(fnHttpGet).wasCalled().once();
            expect(fnHttpGetResponse).wasCalled().once();
            expect(fnHttpGetRead).wasCalled().once();

            expect(fnFsCreateWriteStream).wasCalled().once().withArgs([dest]);
            expect(fnFsCreateWriteStreamWrite).wasCalled();
            expect(fnFsCreateWriteStreamFinal).wasCalled();
            expect(fnFsExists).wasCalled().once();
        });

        it('creates parent directories and downloads file to disk', async () => {
            // Captures
            let writtenData = '';

            // Given
            const url = 'http://hello.world';
            const parent = 'foo/bar';
            const dest = `${parent}/helloWorld.txt`;
            const contents = 'contents of web file';

            const fnHttpGetRead = mock.fn(function httpGetRead(this: Readable) {
                this.push(contents);
                this.push(null);
            });
            const fnHttpGetResponse = mock.fn(() => {
                const response = new UnimplementedHttpResponse();

                // eslint-disable-next-line no-underscore-dangle
                response._read = fnHttpGetRead;

                return response;
            });
            const fnHttpGet = mock.fn(() => {
                const request = new UnimplementedHttpRequest();

                request.getResponse = fnHttpGetResponse;

                return request;
            });

            const fnFsCreateWriteStreamWrite = mock.fn(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (chunk: any, _encoding, cb: () => void) => {
                    writtenData += chunk.toString();
                    cb();
                },
            );
            const fnFsCreateWriteStreamFinal = mock.fn((cb: () => void) => cb());
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const fnFsCreateWriteStream = mock.fn((_file: string) => Result.Ok(
                new Writable({
                    write: fnFsCreateWriteStreamWrite,
                    final: fnFsCreateWriteStreamFinal,
                }),
            ));
            const fnFsExists = mock.fn(() => Promise.resolve(false));
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const fnFsMkdirp = mock.fn((_file: string) => Promise.resolve(Result.voidOk));

            // Inject
            const deps = emptyDeps<MountPrivateImpl>();

            deps.http = new UnimplementedHttp();
            deps.http.get = fnHttpGet;

            deps.fs = new UnimplementedFs();
            deps.fs.createWriteStream = fnFsCreateWriteStream;
            deps.fs.exists = fnFsExists;
            deps.fs.mkdirp = fnFsMkdirp;

            // When
            const sut = new MountPrivateImpl(deps);
            const result = await sut.downloadFile(url, dest);

            // Then
            expect(result).toBeOk();

            expect(writtenData).toBe(contents);

            expect(fnHttpGet).wasCalled().once();
            expect(fnHttpGetResponse).wasCalled().once();
            expect(fnHttpGetRead).wasCalled().once();

            expect(fnFsCreateWriteStream).wasCalled().once().withArgs([dest]);
            expect(fnFsCreateWriteStreamWrite).wasCalled();
            expect(fnFsCreateWriteStreamFinal).wasCalled();
            expect(fnFsExists).wasCalled().once();
            expect(fnFsMkdirp).wasCalled().once().withArgs([parent]);
        });
    });
});
