import type {} from 'mocha';

import Path from 'path';

import { emptyDeps, cases } from '@madwire-media/di-container';
import { mock, expect } from '@madwire-media/expect';
import { Result } from '@madwire-media/result';

import { UnimplementedFs } from '@madwire-media/fs/mocks/unimplemented';
import { FsError } from '@madwire-media/fs';
import { UnimplementedMountPrivate } from './private.mock';
import { UnimplementedCacheHandle } from '../../../tmpfs/mock';
import { UnimplementedEnv } from '../../../env/mock';
import { DudLogger } from '../../../logger/mocks/dud';

import { SingleMounterImpl } from './single';
import { MountRecord } from './types';

describe('mount/impls/default/single (unit)', () => {
    describe('mountFile', () => {
        it('throws error when source does not exist', async () => {
            // Given
            const rawSource = '/foo/file.txt';
            const rawDest = '/bar/file.txt';
            const relPrefix = 'relpath';
            const isHttp = false;

            const source = relPrefix + rawSource;

            const fnFsExists = mock.fn(
                cases([
                    [[source], Promise.resolve(false)],
                ]),
            );

            // Inject
            const deps = emptyDeps<SingleMounterImpl>();

            deps.fs = new UnimplementedFs();
            deps.fs.exists = fnFsExists;

            deps.mountPrivate = new UnimplementedMountPrivate();
            deps.mountPrivate.isHttp = () => isHttp;

            deps.cacheHandle = new UnimplementedCacheHandle('single mounter');

            deps.env = new UnimplementedEnv('/');
            deps.env.toPwdRelative = (path) => relPrefix + path;

            deps.logger = new DudLogger();

            // When
            const sut = new SingleMounterImpl(deps);
            const result = await sut.mountFile(rawSource, rawDest);

            // Then
            const error = expect(result)
                .toBeErr().andUnwrap
                .toBeAn(FsError)
                .toHaveMessage('Cannot copy nonexistent file')
                .value;

            expect(error.code).toBe('ENOENT');

            expect(fnFsExists).wasCalled().exactlyWithArgs([
                [source],
            ]);
        });

        it('only copies file from one place to another when not under existing mount', async () => {
            // Given
            const rawSource = '/foo/file.txt';
            const rawDest = '/bar/file.txt';
            const relPrefix = 'relpath';
            const mountedUnderneath = true;
            const isHttp = false;

            const source = relPrefix + rawSource;
            const dest = relPrefix + rawDest;

            const fnFsExists = mock.fn(
                cases([
                    [[source], Promise.resolve(true)],
                    [[dest], Promise.resolve(false)],
                ]),
            );
            const fnFsCopy = mock.fn(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                (_source: string, _dest: string) => Result.promise.Ok(undefined),
            );

            // Inject
            const deps = emptyDeps<SingleMounterImpl>();

            deps.fs = new UnimplementedFs();
            deps.fs.exists = fnFsExists;
            deps.fs.mkdirp = () => Result.promise.Ok(undefined);
            deps.fs.copy = fnFsCopy;

            deps.mountPrivate = new UnimplementedMountPrivate();
            deps.mountPrivate.isHttp = () => isHttp;
            deps.mountPrivate.isMountedUnderneath = () => mountedUnderneath;

            deps.cacheHandle = new UnimplementedCacheHandle('single mounter');

            deps.env = new UnimplementedEnv('/');
            deps.env.toPwdRelative = (path) => relPrefix + path;

            deps.logger = new DudLogger();

            // When
            const sut = new SingleMounterImpl(deps);
            const result = await sut.mountFile(rawSource, rawDest);

            // Then
            expect(result).toBeOk().andUnwrap.toBe(undefined);

            expect(fnFsExists).wasCalled().exactlyWithArgs([
                [source],
                [dest],
            ]);

            expect(fnFsCopy).wasCalled().once().withArgs([source, dest]);
        });

        it('creates parent directories for dest if they do not exist', async () => {
            // Given
            const rawSource = '/foo/file.txt';
            const rawDest = '/bar/file.txt';
            const relPrefix = 'relpath';
            const mountedUnderneath = true;
            const isHttp = false;

            const source = relPrefix + rawSource;
            const dest = relPrefix + rawDest;

            const fnFsExists = mock.fn(
                cases([
                    [[source], Promise.resolve(true)],
                    [[dest], Promise.resolve(false)],
                ]),
            );
            const fnFsMkdirp = mock.fn(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                (_path: string) => Result.promise.Ok(undefined),
            );

            // Inject
            const deps = emptyDeps<SingleMounterImpl>();

            deps.fs = new UnimplementedFs();
            deps.fs.exists = fnFsExists;
            deps.fs.mkdirp = fnFsMkdirp;
            deps.fs.copy = () => Result.promise.Ok(undefined);

            deps.mountPrivate = new UnimplementedMountPrivate();
            deps.mountPrivate.isHttp = () => isHttp;
            deps.mountPrivate.isMountedUnderneath = () => mountedUnderneath;

            deps.cacheHandle = new UnimplementedCacheHandle('single mounter');

            deps.env = new UnimplementedEnv('/');
            deps.env.toPwdRelative = (path) => relPrefix + path;

            deps.logger = new DudLogger();

            // When
            const sut = new SingleMounterImpl(deps);
            const result = await sut.mountFile(rawSource, rawDest);

            // Then
            expect(result).toBeOk().andUnwrap.toBe(undefined);

            expect(fnFsExists).wasCalled().exactlyWithArgs([
                [source],
                [dest],
            ]);

            expect(fnFsMkdirp).wasCalled().once().withArgs([Path.dirname(dest)]);
        });

        it('creates record when not under existing mount', async () => {
            // Given
            const rawSource = '/foo/file.txt';
            const rawDest = '/bar/file.txt';
            const relPrefix = 'relpath';
            const mountedUnderneath = false;
            const isHttp = false;

            const source = relPrefix + rawSource;
            const dest = relPrefix + rawDest;
            const mountRecord: MountRecord = {
                dest: rawDest,
                replaced: false,
            };

            const fnFsExists = cases([
                [[source], Promise.resolve(true)],
                [[dest], Promise.resolve(false)],
            ]);

            const fnMountPrivateWriteMountRecord = mock.fn(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                (_record: MountRecord, _name: string) => Result.promise.Ok(undefined),
            );

            // Inject
            const deps = emptyDeps<SingleMounterImpl>();

            deps.fs = new UnimplementedFs();
            deps.fs.exists = fnFsExists;
            deps.fs.mkdirp = () => Result.promise.Ok(undefined);
            deps.fs.copy = () => Result.promise.Ok(undefined);

            deps.mountPrivate = new UnimplementedMountPrivate();
            deps.mountPrivate.isHttp = () => isHttp;
            deps.mountPrivate.isMountedUnderneath = () => mountedUnderneath;
            deps.mountPrivate.writeMountRecord = fnMountPrivateWriteMountRecord;

            deps.cacheHandle = new UnimplementedCacheHandle('single mounter');

            deps.env = new UnimplementedEnv('/');
            deps.env.toPwdRelative = (path) => relPrefix + path;

            deps.logger = new DudLogger();

            // When
            const sut = new SingleMounterImpl(deps);
            const result = await sut.mountFile(rawSource, rawDest);

            // Then
            expect(result).toBeOk().andUnwrap.toEqual(mountRecord);

            expect(fnMountPrivateWriteMountRecord).wasCalled().once();
            expect(
                fnMountPrivateWriteMountRecord.mock.calls[0].args,
            ).toEqual([mountRecord, '1']);
        });

        it('moves old files and creates record when dest exists and not under existing mount', async () => {
            // Given
            const rawSource = '/foo/file.txt';
            const rawDest = '/bar/file.txt';
            const uniqueName = 'youniqua';
            const relPrefix = 'relpath';
            const mountedUnderneath = false;
            const isHttp = false;

            const source = relPrefix + rawSource;
            const dest = relPrefix + rawDest;
            const mountRecord: MountRecord = {
                dest: rawDest,
                replaced: uniqueName,
            };

            const fnFsExists = cases([
                [[source], Promise.resolve(true)],
                [[dest], Promise.resolve(true)],
            ]);

            const fnFsRename = mock.fn(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                (_from: string, _to: string) => Result.promise.Ok(undefined),
            );

            const fnMountPrivateWriteMountRecord = mock.fn(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                (_record: MountRecord, _name: string) => Result.promise.Ok(undefined),
            );

            const fnTmpFsHandleGenerateUniqueName = mock.fn(
                () => Promise.resolve(uniqueName),
            );
            const fnTmpFsHandleNameToPath = mock.fn(
                (path: string) => `/tmp/${path}`,
            );

            // Inject
            const deps = emptyDeps<SingleMounterImpl>();

            deps.fs = new UnimplementedFs();
            deps.fs.exists = fnFsExists;
            deps.fs.mkdirp = () => Result.promise.Ok(undefined);
            deps.fs.copy = () => Result.promise.Ok(undefined);
            deps.fs.rename = fnFsRename;

            deps.mountPrivate = new UnimplementedMountPrivate();
            deps.mountPrivate.isHttp = () => isHttp;
            deps.mountPrivate.isMountedUnderneath = () => mountedUnderneath;
            deps.mountPrivate.writeMountRecord = fnMountPrivateWriteMountRecord;

            deps.cacheHandle = new UnimplementedCacheHandle('single mounter');
            deps.cacheHandle.generateUniqueName = fnTmpFsHandleGenerateUniqueName;
            deps.cacheHandle.nameToPath = fnTmpFsHandleNameToPath;

            deps.env = new UnimplementedEnv('/');
            deps.env.toPwdRelative = (path) => relPrefix + path;

            deps.logger = new DudLogger();

            // When
            const sut = new SingleMounterImpl(deps);
            const result = await sut.mountFile(rawSource, rawDest);

            // Then
            expect(result).toBeOk().andUnwrap.toEqual(mountRecord);

            expect(fnFsRename).wasCalled().once().withArgs([dest, `relpath/tmp/${uniqueName}`]);

            expect(fnMountPrivateWriteMountRecord).wasCalled().once();
            expect(
                fnMountPrivateWriteMountRecord.mock.calls[0].args,
            ).toEqual([mountRecord, '1']);

            expect(fnTmpFsHandleGenerateUniqueName).wasCalled().once();
            expect(fnTmpFsHandleNameToPath).wasCalled().once().withArgs([uniqueName]);
        });

        it('deletes record if rename fails and returns rename error', async () => {
            // Given
            const rawSource = '/foo/file.txt';
            const rawDest = '/bar/file.txt';
            const uniqueName = 'youniqua';
            const relPrefix = 'relpath';
            const mountedUnderneath = false;
            const isHttp = false;

            const source = relPrefix + rawSource;
            const dest = relPrefix + rawDest;
            const mountRecord: MountRecord = {
                dest: rawDest,
                replaced: uniqueName,
            };

            const renameError = new FsError({
                message: 'error renaming file',
            });

            const fnFsExists = cases([
                [[source], Promise.resolve(true)],
                [[dest], Promise.resolve(true)],
            ]);

            const fnFsRename = mock.fn(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                (_from: string, _to: string) => Result.promise.Err(renameError),
            );

            const fnMountPrivateWriteMountRecord = mock.fn(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                (_record: MountRecord, _name: string) => Result.promise.Ok(undefined),
            );
            const fnMountPrivateDeleteMountRecord = mock.fn(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                (_name: string) => Result.promise.Ok(undefined),
            );

            // Inject
            const deps = emptyDeps<SingleMounterImpl>();

            deps.fs = new UnimplementedFs();
            deps.fs.exists = fnFsExists;
            deps.fs.copy = () => Result.promise.Ok(undefined);
            deps.fs.rename = fnFsRename;

            deps.mountPrivate = new UnimplementedMountPrivate();
            deps.mountPrivate.isHttp = () => isHttp;
            deps.mountPrivate.isMountedUnderneath = () => mountedUnderneath;
            deps.mountPrivate.writeMountRecord = fnMountPrivateWriteMountRecord;
            deps.mountPrivate.deleteMountRecord = fnMountPrivateDeleteMountRecord;

            deps.cacheHandle = new UnimplementedCacheHandle('single mounter');
            deps.cacheHandle.generateUniqueName = () => Promise.resolve(uniqueName);
            deps.cacheHandle.nameToPath = (path) => `/tmp/${path}`;

            deps.env = new UnimplementedEnv('/');
            deps.env.toPwdRelative = (path) => relPrefix + path;

            deps.logger = new DudLogger();

            // When
            const sut = new SingleMounterImpl(deps);
            const result = await sut.mountFile(rawSource, rawDest);

            // Then
            expect(result).toBeErr().andUnwrap.toEqual(renameError);

            expect(fnFsRename).wasCalled().once().withArgs([dest, `relpath/tmp/${uniqueName}`]);

            expect(fnMountPrivateWriteMountRecord).wasCalled().once();
            expect(
                fnMountPrivateWriteMountRecord.mock.calls[0].args,
            ).toEqual([mountRecord, '1']);

            expect(fnMountPrivateDeleteMountRecord).wasCalled().once().withArgs(['1']);
        });

        it('deletes old files when dest exists and under existing mount', async () => {
            // Given
            const rawSource = '/foo/file.txt';
            const rawDest = '/bar/file.txt';
            const relPrefix = 'relpath';
            const mountedUnderneath = true;
            const isHttp = false;

            const source = relPrefix + rawSource;
            const dest = relPrefix + rawDest;

            const fnFsExists = cases([
                [[source], Promise.resolve(true)],
                [[dest], Promise.resolve(true)],
            ]);

            const fnFsRemove = mock.fn(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                (_path: string) => Result.promise.Ok(undefined),
            );

            // Inject
            const deps = emptyDeps<SingleMounterImpl>();

            deps.fs = new UnimplementedFs();
            deps.fs.exists = fnFsExists;
            deps.fs.copy = () => Result.promise.Ok(undefined);
            deps.fs.remove = fnFsRemove;

            deps.mountPrivate = new UnimplementedMountPrivate();
            deps.mountPrivate.isHttp = () => isHttp;
            deps.mountPrivate.isMountedUnderneath = () => mountedUnderneath;

            deps.cacheHandle = new UnimplementedCacheHandle('single mounter');

            deps.env = new UnimplementedEnv('/');
            deps.env.toPwdRelative = (path) => relPrefix + path;

            deps.logger = new DudLogger();

            // When
            const sut = new SingleMounterImpl(deps);
            const result = await sut.mountFile(rawSource, rawDest);

            // Then
            expect(result).toBeOk().andUnwrap.toEqual(undefined);

            expect(fnFsRemove).wasCalled().once().withArgs([dest]);
        });

        it('downloads file when source is a url', async () => {
            // Given
            const source = 'http://foo.com/file.txt';
            const rawDest = '/bar/file.txt';
            const relPrefix = 'relpath';
            const mountedUnderneath = true;
            const isHttp = true;

            const dest = relPrefix + rawDest;

            const fnFsExists = mock.fn(
                cases([
                    [[source], Promise.resolve(true)],
                    [[dest], Promise.resolve(false)],
                ]),
            );

            const fnMountPrivateDownloadFile = mock.fn(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                (_url: string, _dest: string) => Result.promise.Ok(undefined),
            );

            // Inject
            const deps = emptyDeps<SingleMounterImpl>();

            deps.fs = new UnimplementedFs();
            deps.fs.exists = fnFsExists;
            deps.fs.mkdirp = () => Result.promise.Ok(undefined);

            deps.mountPrivate = new UnimplementedMountPrivate();
            deps.mountPrivate.isHttp = () => isHttp;
            deps.mountPrivate.isMountedUnderneath = () => mountedUnderneath;
            deps.mountPrivate.downloadFile = fnMountPrivateDownloadFile;

            deps.cacheHandle = new UnimplementedCacheHandle('single mounter');

            deps.env = new UnimplementedEnv('/');
            deps.env.toPwdRelative = (path) => relPrefix + path;

            deps.logger = new DudLogger();

            // When
            const sut = new SingleMounterImpl(deps);
            const result = await sut.mountFile(source, rawDest);

            // Then
            expect(result).toBeOk().andUnwrap.toBe(undefined);

            expect(fnFsExists).wasCalled().exactlyWithArgs([
                [dest],
            ]);

            expect(fnMountPrivateDownloadFile).wasCalled().once().withArgs([source, dest]);
        });
    });

    describe('unmountFile', () => {
        it('does nothing when state is already clean', async () => {
            // Given
            const rawDest = 'foo/bar.txt';
            const relPrefix = 'relpath';

            const dest = relPrefix + rawDest;
            const mountRecord: MountRecord = {
                dest: rawDest,
                replaced: false,
            };

            const fnFsExists = mock.fn(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                (_path: string) => Promise.resolve(false),
            );

            // Inject
            const deps = emptyDeps<SingleMounterImpl>();

            deps.fs = new UnimplementedFs();
            deps.fs.exists = fnFsExists;

            deps.env = new UnimplementedEnv('/');
            deps.env.toPwdRelative = (path) => relPrefix + path;

            deps.cacheHandle = new UnimplementedCacheHandle('single mounter');
            deps.cacheHandle.nameToPath = (path) => `/tmp/${path}`;

            deps.logger = new DudLogger();

            // When
            const sut = new SingleMounterImpl(deps);
            const result = await sut.unmountFile(mountRecord);

            // Then
            expect(result).toBeOk();

            expect(fnFsExists).wasCalled().once().withArgs([dest]);
        });

        it('deletes old file if it exists', async () => {
            // Given
            const rawDest = 'foo/bar.txt';
            const relPrefix = 'relpath';

            const dest = relPrefix + rawDest;
            const mountRecord: MountRecord = {
                dest: rawDest,
                replaced: false,
            };

            const fnFsExists = mock.fn(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                (_path: string) => Promise.resolve(true),
            );
            const fnFsRemove = mock.fn(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                (_path: string) => Result.promise.Ok(undefined),
            );

            // Inject
            const deps = emptyDeps<SingleMounterImpl>();

            deps.fs = new UnimplementedFs();
            deps.fs.exists = fnFsExists;
            deps.fs.remove = fnFsRemove;

            deps.env = new UnimplementedEnv('/');
            deps.env.toPwdRelative = (path) => relPrefix + path;

            deps.cacheHandle = new UnimplementedCacheHandle('single mounter');
            deps.cacheHandle.nameToPath = (path) => `/tmp/${path}`;

            deps.logger = new DudLogger();

            // When
            const sut = new SingleMounterImpl(deps);
            const result = await sut.unmountFile(mountRecord);

            // Then
            expect(result).toBeOk();

            expect(fnFsExists).wasCalled().once().withArgs([dest]);
            expect(fnFsRemove).wasCalled().once().withArgs([dest]);
        });

        it('moves original file back in place if there was one', async () => {
            // Given
            const rawDest = '/foo/bar.txt';
            const rawReplaced = '42';
            const relPrefix = 'relpath';

            const dest = relPrefix + rawDest;
            const replaced = `${relPrefix}/tmp/${rawReplaced}`;
            const mountRecord: MountRecord = {
                dest: rawDest,
                replaced: rawReplaced,
            };

            const fnFsRename = mock.fn(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                (_from: string, _to: string) => Result.promise.Ok(undefined),
            );

            // Inject
            const deps = emptyDeps<SingleMounterImpl>();

            deps.fs = new UnimplementedFs();
            deps.fs.exists = () => Promise.resolve(false);
            deps.fs.rename = fnFsRename;

            deps.env = new UnimplementedEnv('/');
            deps.env.toPwdRelative = (path) => relPrefix + path;

            deps.cacheHandle = new UnimplementedCacheHandle('single mounter');
            deps.cacheHandle.nameToPath = (path) => `/tmp/${path}`;

            deps.logger = new DudLogger();

            // When
            const sut = new SingleMounterImpl(deps);
            const result = await sut.unmountFile(mountRecord);

            // Then
            expect(result).toBeOk();

            expect(fnFsRename).wasCalled().once().withArgs([replaced, dest]);
        });
    });
});
