import type {} from 'mocha';

import { emptyDeps, cases } from '@madwire-media/di-container';
import { mock, expect } from '@madwire-media/expect';
import { Result, ResultOk } from '@madwire-media/result';
import { FsError } from '@madwire-media/fs';
import { DefaultMounter } from './impl';
import { UnimplementedSingleMounter } from './single.mock';
import { MountRecord } from './types';
import { UnimplementedMountPrivate } from './private.mock';
import { DudLogger } from '../../../logger/mocks/dud';

describe('mount/impls/default (unit)', () => {
    describe('doMount', () => {
        it('calls SingleMounter.mountFile for every input', async () => {
            // Given
            const request = {
                'some/dest': '/some/source',
                'another.dest': 'http://another.source/file',
                'final-destination.txt': 'im/out/of/ideas.txt',
            };
            const serviceName = 'my-service';

            const fnSingleMounterMountFile = mock.fn(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                (_source: string, _dest: string) => Result.promise.Ok(undefined),
            );

            // Inject
            const deps = emptyDeps<DefaultMounter>();

            deps.singleMounter = new UnimplementedSingleMounter();
            deps.singleMounter.mountFile = fnSingleMounterMountFile;

            // When
            const sut = new DefaultMounter(deps);
            const result = await sut.doMount(request, serviceName);

            // Then
            expect(result).toBeOk().andUnwrap.toBeUndefined();

            expect(fnSingleMounterMountFile).wasCalled().exactlyWithArgs([
                ['/some/source', 'my-service/some/dest'],
                ['http://another.source/file', 'my-service/another.dest'],
                ['im/out/of/ideas.txt', 'my-service/final-destination.txt'],
            ]);
        });

        it('calls SingleMounter.unmountFile for all completed mounts on failure', async () => {
            // Given
            const request = {
                'some/dest': '/some/source',
                'another.dest': 'http://another.source/file',
                'final-destination.txt': 'im/out/of/ideas.txt',
            };
            const serviceName = 'my-service';

            const fnSingleMounterMountFile = mock.fn(
                async (source: string, dest: string) => {
                    if (source === 'im/out/of/ideas.txt') {
                        return Result.Err(new FsError({
                            message: 'Injected mount failure',
                        }));
                    } else {
                        return Result.Ok({
                            dest,
                            replaced: false,
                        } as MountRecord);
                    }
                },
            );
            const fnSingleMounterUnmountFile = mock.fn(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                (_mount: MountRecord) => Result.promise.Ok(undefined),
            );

            // Inject
            const deps = emptyDeps<DefaultMounter>();

            deps.singleMounter = new UnimplementedSingleMounter();
            deps.singleMounter.mountFile = fnSingleMounterMountFile;
            deps.singleMounter.unmountFile = fnSingleMounterUnmountFile;

            // When
            const sut = new DefaultMounter(deps);
            const result = await sut.doMount(request, serviceName);

            // Then
            expect(result).toBeErr();

            expect(fnSingleMounterMountFile).wasCalled().exactlyWithArgs([
                ['/some/source', 'my-service/some/dest'],
                ['http://another.source/file', 'my-service/another.dest'],
                ['im/out/of/ideas.txt', 'my-service/final-destination.txt'],
            ]);
            expect(fnSingleMounterUnmountFile).wasCalled().times(2);
            expect(
                fnSingleMounterUnmountFile.mock.calls.map(
                    (call) => call.args[0] as MountRecord,
                ),
            ).toEqual([
                {
                    dest: 'my-service/another.dest',
                    replaced: false as const,
                },
                {
                    dest: 'my-service/some/dest',
                    replaced: false as const,
                },
            ]);
        });
    });

    describe('clearMounts', () => {
        it('calls SingleMounter.unmountFile for every listed mount', async () => {
            // Given
            const files = {
                1: {
                    dest: 'some/dest',
                    replaced: false,
                } as MountRecord,
                2: {
                    dest: 'another.dest',
                    replaced: false,
                } as MountRecord,
                3: {
                    dest: 'im/out/of/ideas.txt',
                    replaced: false,
                } as MountRecord,
            };
            const sortedFilenames = ['3', '2', '1'];

            const fnMountPrivateGetMountRecords = mock.fn(
                () => Result.promise.Ok(sortedFilenames),
            );
            const fnMountPrivateReadMountRecord = mock.fn(
                cases(
                    Object.entries(files)
                        .sort(([aName], [bName]) => +aName - +bName)
                        .map(
                            ([key, value]) => [
                                [key],
                                Result.promise.Ok(value),
                            ] as [[string], Promise<ResultOk<MountRecord>>],
                        ),
                ),
            );

            const fnSingleMounterUnmountFile = mock.fn(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                (_record: MountRecord) => Result.promise.Ok(undefined),
            );

            // Inject
            const deps = emptyDeps<DefaultMounter>();

            deps.mountPrivate = new UnimplementedMountPrivate();
            deps.mountPrivate.getMountRecords = fnMountPrivateGetMountRecords;
            deps.mountPrivate.readMountRecord = fnMountPrivateReadMountRecord;

            deps.singleMounter = new UnimplementedSingleMounter();
            deps.singleMounter.unmountFile = fnSingleMounterUnmountFile;

            deps.logger = new DudLogger();

            // When
            const sut = new DefaultMounter(deps);
            const result = await sut.clearMounts();

            // Then
            expect(result).toBeOk();

            expect(fnMountPrivateGetMountRecords).wasCalled().once();
            expect(fnMountPrivateReadMountRecord).wasCalled().exactlyWithArgs([
                ['3'],
                ['2'],
                ['1'],
            ]);

            expect(fnSingleMounterUnmountFile).wasCalled().exactlyWithArgs([
                [files[3]],
                [files[2]],
                [files[1]],
            ]);
        });

        it('returns error immediately when list mounts fails', async () => {
            // Given
            const fnMountPrivateGetMountRecords = mock.fn(
                () => Result.promise.Err(new FsError({
                    message: 'Injected error',
                })),
            );

            // Inject
            const deps = emptyDeps<DefaultMounter>();

            deps.mountPrivate = new UnimplementedMountPrivate();
            deps.mountPrivate.getMountRecords = fnMountPrivateGetMountRecords;

            deps.logger = new DudLogger();

            // When
            const sut = new DefaultMounter(deps);
            const result = await sut.clearMounts();

            // Then
            expect(result).toBeErr();

            expect(fnMountPrivateGetMountRecords).wasCalled().once();
        });

        it('returns error when one or more reads fail', async () => {
            // Given
            const sortedFilenames = ['3', '2', '1'];

            const fnMountPrivateGetMountRecords = mock.fn(
                () => Result.promise.Ok(sortedFilenames),
            );
            const fnMountPrivateReadMountRecord = mock.fn(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                (_name: string) => Result.promise.Err(new Error('Injected error')),
            );

            // Inject
            const deps = emptyDeps<DefaultMounter>();

            deps.mountPrivate = new UnimplementedMountPrivate();
            deps.mountPrivate.getMountRecords = fnMountPrivateGetMountRecords;
            deps.mountPrivate.readMountRecord = fnMountPrivateReadMountRecord;

            deps.logger = new DudLogger();

            // When
            const sut = new DefaultMounter(deps);
            const result = await sut.clearMounts();

            // Then
            expect(result).toBeErr();

            expect(fnMountPrivateGetMountRecords).wasCalled().once();
            expect(fnMountPrivateReadMountRecord).wasCalled().exactlyWithArgs([
                ['3'],
                ['2'],
                ['1'],
            ]);
        });

        it('calls SingleMounter.unmountFile for every listed mount', async () => {
            // Given
            const files = {
                1: {
                    dest: 'some/dest',
                    replaced: false,
                } as MountRecord,
                2: {
                    dest: 'another.dest',
                    replaced: false,
                } as MountRecord,
                3: {
                    dest: 'im/out/of/ideas.txt',
                    replaced: false,
                } as MountRecord,
            };
            const sortedFilenames = ['3', '2', '1'];

            const fnMountPrivateGetMountRecords = mock.fn(
                () => Result.promise.Ok(sortedFilenames),
            );
            const fnMountPrivateReadMountRecord = mock.fn(
                cases(
                    Object.entries(files)
                        .sort(([aName], [bName]) => +aName - +bName)
                        .map(
                            ([key, value]) => [
                                [key],
                                Result.promise.Ok(value),
                            ] as [[string], Promise<ResultOk<MountRecord>>],
                        ),
                ),
            );

            const fnSingleMounterUnmountFile = mock.fn(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                (_record: MountRecord) => Result.promise.Err(new FsError({
                    message: 'Injected error',
                })),
            );

            // Inject
            const deps = emptyDeps<DefaultMounter>();

            deps.mountPrivate = new UnimplementedMountPrivate();
            deps.mountPrivate.getMountRecords = fnMountPrivateGetMountRecords;
            deps.mountPrivate.readMountRecord = fnMountPrivateReadMountRecord;

            deps.singleMounter = new UnimplementedSingleMounter();
            deps.singleMounter.unmountFile = fnSingleMounterUnmountFile;

            deps.logger = new DudLogger();

            // When
            const sut = new DefaultMounter(deps);
            const result = await sut.clearMounts();

            // Then
            expect(result).toBeErr();

            expect(fnMountPrivateGetMountRecords).wasCalled().once();
            expect(fnMountPrivateReadMountRecord).wasCalled().exactlyWithArgs([
                ['3'],
                ['2'],
                ['1'],
            ]);

            expect(fnSingleMounterUnmountFile).wasCalled().exactlyWithArgs([
                [files[3]],
                [files[2]],
                [files[1]],
            ]);
        });
    });

    describe('cleanup', () => {
        it('calls SingleMounter.unmountFile for every given mount', async () => {
            // Given
            const files = {
                1: {
                    dest: 'some/dest',
                    replaced: false,
                } as MountRecord,
                2: {
                    dest: 'another.dest',
                    replaced: false,
                } as MountRecord,
                3: {
                    dest: 'im/out/of/ideas.txt',
                    replaced: false,
                } as MountRecord,
            };
            const sortedFilenames = ['3', '2', '1'];

            const fnMountPrivateReadMountRecord = mock.fn(
                cases(
                    Object.entries(files)
                        .map(
                            ([key, value]) => [
                                [key],
                                Result.promise.Ok(value),
                            ] as [[string], Promise<ResultOk<MountRecord>>],
                        ),
                ),
            );

            const fnSingleMounterUnmountFile = mock.fn(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                (_record: MountRecord) => Result.promise.Ok(undefined),
            );

            // Inject
            const deps = emptyDeps<DefaultMounter>();

            deps.mountPrivate = new UnimplementedMountPrivate();
            deps.mountPrivate.readMountRecord = fnMountPrivateReadMountRecord;

            deps.singleMounter = new UnimplementedSingleMounter();
            deps.singleMounter.unmountFile = fnSingleMounterUnmountFile;

            deps.logger = new DudLogger();

            // When
            const sut = new DefaultMounter(deps);
            const result = await sut.cleanup(sortedFilenames);

            // Then
            expect(result).toBeOk();

            expect(fnMountPrivateReadMountRecord).wasCalled().exactlyWithArgs([
                ['3'],
                ['2'],
                ['1'],
            ]);

            expect(fnSingleMounterUnmountFile).wasCalled().exactlyWithArgs([
                [files[3]],
                [files[2]],
                [files[1]],
            ]);
        });

        it('returns error when one or more reads fail', async () => {
            // Given
            const sortedFilenames = ['3', '2', '1'];

            const fnMountPrivateReadMountRecord = mock.fn(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                (_name: string) => Result.promise.Err(new Error('Injected error')),
            );

            // Inject
            const deps = emptyDeps<DefaultMounter>();

            deps.mountPrivate = new UnimplementedMountPrivate();
            deps.mountPrivate.readMountRecord = fnMountPrivateReadMountRecord;

            deps.singleMounter = new UnimplementedSingleMounter();

            deps.logger = new DudLogger();

            // When
            const sut = new DefaultMounter(deps);
            const result = await sut.cleanup(sortedFilenames);

            // Then
            expect(result).toBeErr();

            expect(fnMountPrivateReadMountRecord).wasCalled().exactlyWithArgs([
                ['3'],
                ['2'],
                ['1'],
            ]);
        });

        it('returns error when one or more unmounts fail', async () => {
            // Given
            const files = {
                1: {
                    dest: 'some/dest',
                    replaced: false,
                } as MountRecord,
                2: {
                    dest: 'another.dest',
                    replaced: false,
                } as MountRecord,
                3: {
                    dest: 'im/out/of/ideas.txt',
                    replaced: false,
                } as MountRecord,
            };
            const sortedFilenames = ['3', '2', '1'];

            const fnMountPrivateReadMountRecord = mock.fn(
                cases(
                    Object.entries(files)
                        .map(
                            ([key, value]) => [
                                [key],
                                Result.promise.Ok(value),
                            ] as [[string], Promise<ResultOk<MountRecord>>],
                        ),
                ),
            );

            const fnSingleMounterUnmountFile = mock.fn(
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                (_record: MountRecord) => Result.promise.Err(new FsError({
                    message: 'Injected error',
                })),
            );

            // Inject
            const deps = emptyDeps<DefaultMounter>();

            deps.mountPrivate = new UnimplementedMountPrivate();
            deps.mountPrivate.readMountRecord = fnMountPrivateReadMountRecord;

            deps.singleMounter = new UnimplementedSingleMounter();
            deps.singleMounter.unmountFile = fnSingleMounterUnmountFile;

            deps.logger = new DudLogger();

            // When
            const sut = new DefaultMounter(deps);
            const result = await sut.cleanup(sortedFilenames);

            // Then
            expect(result).toBeErr();

            expect(fnMountPrivateReadMountRecord).wasCalled().exactlyWithArgs([
                ['3'],
                ['2'],
                ['1'],
            ]);

            expect(fnSingleMounterUnmountFile).wasCalled().exactlyWithArgs([
                [files[3]],
                [files[2]],
                [files[1]],
            ]);
        });
    });
});
