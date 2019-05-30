import * as Path from 'path';
import { Readable, Writable } from 'stream';

import {
    CopyOptions, defaultCopyOptions, defaultWalkOptions, FileMutator, Fs,
    FsError, FsPromiseResult, FsResult, Stats, WalkCallback, WalkOptions,
} from '..';
import { Result, ResultErr, ResultOk } from '../../../util/result';

function enoent(): ResultErr<FsError> {
    return Result.Err(new FsError({
        code: 'ENOENT',
        message: 'no such file or directory',
    }));
}

function eexist(): ResultErr<FsError> {
    return Result.Err(new FsError({
        code: 'EEXIST',
        message: 'file already exists',
    }));
}

function splitPath(path: string): {pathTo: string, filename: string} {
    const parsed = Path.parse(path);

    return {
        pathTo: parsed.dir,
        filename: parsed.base,
    };
}

export class InMemoryFsStats implements Stats {
    private readonly isDir: boolean;
    private readonly mode: number;

    constructor({isDir, mode}: {isDir: boolean, mode: number}) {
        this.isDir = isDir;
        this.mode = mode;
    }

    public isDirectory(): boolean {
        return this.isDir;
    }

    public getMode(): number {
        return this.mode;
    }
}

export interface RawFiles {
    [filename: string]: string | RawFiles;
}

type FsEntity = File | Directory;

interface FsEntityAbstract {
    mode: number;

    expectFile(): Result<File, FsError>;
    expectDir(): Result<Directory, FsError>;
    stats(): InMemoryFsStats;
    duplicate(): FsEntity;
    mutate(mutator: FileMutator, from: string, to: string): Promise<FsEntity>;
    walk(up: boolean, cb: WalkCallback, relpath: string): void;
}

class File implements FsEntityAbstract {
    public contents: string;
    public mode: number = 0o664;

    constructor(contents: string) {
        this.contents = contents;
    }

    public toRaw() {
        return this.contents;
    }

    public expectFile(): ResultOk<this> {
        return Result.Ok(this);
    }

    public expectDir(): ResultErr<FsError> {
        return Result.Err(new FsError({
            code: 'ENOTDIR',
            message: 'expected a directory, found a file',
        }));
    }

    public stats(): InMemoryFsStats {
        return new InMemoryFsStats({
            isDir: false,
            mode: this.mode,
        });
    }

    public duplicate(): File {
        const outFile = new File(this.contents);

        return outFile;
    }

    public async mutate(mutator: FileMutator, from: string, to: string): Promise<File> {
        const outFile = new File('');

        const fromStream = this.getReadStream();
        const toStream = outFile.getWriteStream();
        const transformStream = mutator(from, to);

        fromStream.pipe(transformStream).pipe(toStream);

        await new Promise((resolve, reject) => {
            toStream.on('error', (error) => reject(new FsError(error)));
            toStream.on('end', () => resolve());
        });

        return outFile;
    }

    public walk(up: boolean, cb: WalkCallback, relpath: string) {
        cb(relpath, false);
    }

    public getReadStream(): NodeJS.ReadableStream {
        const stream = new Readable();

        stream._read = () => {/*noop*/};
        stream.push(this.contents);
        stream.push(null);

        return stream;
    }

    public getWriteStream(): NodeJS.WritableStream {
        const stream = new Writable({
            decodeStrings: true,
        });

        stream._write = (chunk: string, encoding, callback) => {
            this.contents += chunk;
            callback();
        };

        return stream;
    }
}

class Directory implements FsEntityAbstract {
    public entities: {[name: string]: FsEntity} = {};
    public mode: number = 0o775;

    public addFiles(rawFiles: RawFiles) {
        for (const filename in rawFiles) {
            const rawFile = rawFiles[filename];

            if (typeof rawFile === 'string') {
                const file = new File(rawFile);
                this.entities[filename] = file;
            } else {
                const dir = new Directory();
                dir.addFiles(rawFile);
                this.entities[filename] = dir;
            }
        }
    }

    public toRaw(): RawFiles {
        const out: RawFiles & object = {};

        for (const filename in this.entities) {
            out[filename] = this.entities[filename].toRaw();
        }

        return out;
    }

    public expectFile(): ResultErr<FsError> {
        return Result.Err(new FsError({
            code: 'EISDIR',
            message: 'expected a file, found a directory',
        }));
    }

    public expectDir(): ResultOk<this> {
        return Result.Ok(this);
    }

    public stats(): InMemoryFsStats {
        return new InMemoryFsStats({
            isDir: true,
            mode: this.mode,
        });
    }

    public duplicate(): Directory {
        const outDir = new Directory();
        outDir.entities = this.entities;

        return outDir;
    }

    public async mutate(mutator: FileMutator, from: string, to: string): Promise<Directory> {
        const outDir = new Directory();

        for (const filename in this.entities) {
            outDir.entities[filename] = await this.entities[filename].mutate(
                mutator,
                Path.join(from, filename),
                Path.join(to, filename),
            );
        }

        return outDir;
    }

    public walk(up: boolean, cb: WalkCallback, relpath: string) {
        if (!up) {
            cb(relpath, true);
        }

        for (const filename in this.entities) {
            this.entities[filename].walk(up, cb, Path.join(relpath, filename));
        }

        if (up) {
            cb(relpath, true);
        }
    }

    public merge(other: Directory, clobber: boolean): FsResult<void> {
        for (const filename in other.entities) {
            const otherEntity = other.entities[filename];

            if (filename in this.entities) {
                const thisEntity = this.entities[filename];

                if (thisEntity instanceof Directory && otherEntity instanceof Directory) {
                    const result = thisEntity.merge(otherEntity, clobber);

                    if (result.isErr()) {
                        return result;
                    }
                } else if (clobber) {
                    this.entities[filename] = otherEntity;
                } else {
                    return eexist();
                }
            } else {
                this.entities[filename] = otherEntity;
            }
        }

        return Result.voidOk;
    }

    public traverse(path: string): FsResult<FsEntity> {
        const parts = path.split('/');
        let entity: FsResult<FsEntity> = Result.Ok(this);

        for (const part of parts) {
            if (part.length === 0) {
                continue;
            }

            entity = entity
                .andThen((entity) => entity.expectDir())
                .andThen((dir) => dir.getEntity(part));
        }

        return entity;
    }

    public mkdirp(path: string): FsResult<Directory> {
        const parts = path.split('/');
        let dir: FsResult<Directory> = Result.Ok(this);

        for (const part of parts) {
            dir = dir
                .andThen((dir) => dir.getOrCreateDirectory(part));
        }

        return dir;
    }

    public isEmpty(): boolean {
        return this.listEntities().length > 0;
    }

    public listEntities(): string[] {
        return Object.keys(this.entities);
    }

    public hasEntity(filename: string): boolean {
        return filename in this.entities;
    }

    public deleteEntity(filename: string): void {
        delete this.entities[filename];
    }

    public getEntity(filename: string): FsResult<FsEntity> {
        const entity = this.entities[filename];

        if (entity === undefined) {
            return enoent();
        }

        return Result.Ok(entity);
    }

    public getOrCreateFile(filename: string): FsResult<File> {
        let entity = this.entities[filename];

        if (entity === undefined) {
            entity = new File('');
            this.entities[filename] = entity;
        }

        return entity.expectFile();
    }

    public getOrCreateDirectory(filename: string): FsResult<Directory> {
        let entity = this.entities[filename];

        if (entity === undefined) {
            entity = new Directory();
            this.entities[filename] = entity;
        }

        return entity.expectDir();
    }
}

class InMemoryFsImpl implements Fs {
    public cwd: string;
    private readonly root: Directory = new Directory();

    constructor(cwd: string, rawFiles?: RawFiles) {
        this.cwd = cwd;

        if (rawFiles !== undefined) {
            this.root.addFiles(rawFiles);
        }
    }

    // ----------------------- FsBasic implementation ----------------------- //
    public async chmod(path: string, mode: number): FsPromiseResult<void> {
        return this.traverse(path)
            .map((entity) => {
                entity.mode = mode;
            });
    }

    public createReadStream(path: string): FsResult<NodeJS.ReadableStream> {
        const {pathTo, filename} = splitPath(path);

        const dirResult = this.traverse(pathTo)
            .andThen((entity) => entity.expectDir());

        const fileResult = dirResult
            .andThen((dir) => dir.getEntity(filename))
            .andThen((entity) => entity.expectFile());

        const streamResult = fileResult
            .map((file) => file.getReadStream());

        return streamResult;
    }

    public createWriteStream(path: string): FsResult<NodeJS.WritableStream> {
        const {pathTo, filename} = splitPath(path);

        const dirResult = this.traverse(pathTo)
            .andThen((entity) => entity.expectDir());

        const fileResult = dirResult
            .andThen((dir) => dir.getOrCreateFile(filename));

        const streamResult = fileResult
            .map((file) => file.getWriteStream());

        return streamResult;
    }

    public async deleteFile(path: string): FsPromiseResult<void> {
        const {pathTo, filename} = splitPath(path);

        const dirResult = this.traverse(pathTo)
            .andThen((entity) => entity.expectDir());

        const fileResult = dirResult
            .andThen((dir) => dir.getEntity(filename))
            .andThen((entity) => entity.expectFile());

        if (fileResult.isOk()) {
            dirResult.unwrap().deleteEntity(filename);
        }

        return fileResult.mapVoid();
    }

    public async deleteDir(path: string): FsPromiseResult<void> {
        const {pathTo, filename} = splitPath(path);

        const dirResult = this.traverse(pathTo)
            .andThen((entity) => entity.expectDir());

        const subdirResult = dirResult
            .andThen((dir) => dir.getEntity(filename))
            .andThen((entity) => entity.expectDir());

        return subdirResult
            .andThen((subdir) => {
                if (subdir.isEmpty()) {
                    return Result.Err(new FsError({
                        code: 'ENOTEMPTY',
                        message: 'directory not empty',
                    }));
                }

                dirResult.unwrap().deleteEntity(filename);

                return Result.voidOk;
            });
    }

    public async exists(path: string): Promise<boolean> {
        return this.traverse(path).isOk();
    }

    public async mkdir(path: string): FsPromiseResult<void> {
        const {pathTo, filename} = splitPath(path);

        const dirResult = this.traverse(pathTo)
            .andThen((entity) => entity.expectDir());

        return dirResult
            .andThen((dir) => {
                if (dir.hasEntity(filename)) {
                    return eexist();
                }

                dir.entities[filename] = new Directory();

                return Result.voidOk;
            });
    }

    public async read(path: string): FsPromiseResult<string> {
        return this.traverse(path)
            .andThen((entity) => entity.expectFile())
            .map((file) => file.contents);
    }

    public async readdir(path: string): FsPromiseResult<string[]> {
        return this.traverse(path)
            .andThen((entity) => entity.expectDir())
            .map((dir) => dir.listEntities());
    }

    public async rename(from: string, to: string): FsPromiseResult<void> {
        const entityResult = this.traverse(from);

        const {pathTo, filename} = splitPath(to);

        const dirResult = this.traverse(pathTo)
            .andThen((entity) => entity.expectDir());

        return dirResult
            .map((dir) => {
                dir.entities[filename] = entityResult.unwrap();
            });
    }

    public async stat(path: string): FsPromiseResult<InMemoryFsStats> {
        return this.traverse(path)
            .map((entity) => entity.stats());
    }

    public async write(path: string, contents: string): FsPromiseResult<void> {
        const {pathTo, filename} = splitPath(path);

        const dirResult = this.traverse(pathTo)
            .andThen((entity) => entity.expectDir());

        return dirResult
            .andThen((dir) => dir.getOrCreateFile(filename))
            .map((file) => {
                file.contents = contents;
            });
    }

    // -------------------------- Fs implementation ------------------------- //
    public async copy(from: string, to: string, customOpts?: CopyOptions): FsPromiseResult<void> {
        const opts = {...defaultCopyOptions, ...customOpts};

        const entityResult = await this.traverse(from)
            .map((entity) => entity.duplicate())
            .async()
            .map<FsEntity>((entity) => {
                if (opts.mutator !== false) {
                    return entity.mutate(opts.mutator, from, to);
                } else {
                    return entity;
                }
            })
            .promise();

        const {pathTo, filename} = splitPath(to);

        const dirResult = entityResult
            .andThen(() => this.traverse(pathTo))
            .andThen((entity) => entity.expectDir());

        return dirResult
            .andThen((dir) => {
                const dirToMerge = new Directory();
                dirToMerge.entities[filename] = entityResult.unwrap();

                return dir.merge(dirToMerge, opts.clobber);
            });
    }

    public async copyFile(from: string, to: string, customOpts?: CopyOptions): FsPromiseResult<void> {
        const opts = {...defaultCopyOptions, ...customOpts};

        const fileResult = await this.traverse(from)
            .andThen((entity) => entity.expectFile())
            .map((file) => file.duplicate())
            .async()
            .map((entity) => {
                if (opts.mutator !== false) {
                    return entity.mutate(opts.mutator, from, to);
                } else {
                    return entity;
                }
            })
            .promise();

        const {pathTo, filename} = splitPath(to);

        const dirResult = fileResult
            .andThen(() => this.traverse(pathTo))
            .andThen((entity) => entity.expectDir());

        return dirResult
            .andThen((dir) => {
                const dirToMerge = new Directory();
                dirToMerge.entities[filename] = fileResult.unwrap();

                return dir.merge(dirToMerge, opts.clobber);
            });
    }

    public async mkdirp(path: string): FsPromiseResult<void> {
        return this.root.mkdirp(path).mapVoid();
    }

    public async remove(path: string): FsPromiseResult<void> {
        const {pathTo, filename} = splitPath(path);

        return this.traverse(pathTo)
            .andThen((entity) => entity.expectDir())
            .map((dir) => dir.deleteEntity(filename));
    }

    public async walkDown(path: string, cb: WalkCallback, customOpts?: WalkOptions): FsPromiseResult<void> {
        const opts = {...defaultWalkOptions, ...customOpts};

        return this.traverse(path)
            .map((entity) => entity.walk(false, cb, '.'));
    }

    public async walkUp(path: string, cb: WalkCallback, customOpts?: WalkOptions): FsPromiseResult<void> {
        const opts = {...defaultWalkOptions, ...customOpts};

        return this.traverse(path)
            .map((entity) => entity.walk(true, cb, '.'));
    }

    // ------------------------- Methods for Testing ------------------------ //
    public toRaw(): RawFiles {
        return this.root.toRaw();
    }

    // --------------------------- Private Methods -------------------------- //
    private traverse(path: string): Result<FsEntity, FsError> {
        if (path.startsWith('/')) {
            path = Path.normalize(path.substr(1));
        } else {
            path = Path.join(this.cwd, path);
        }

        return this.root.traverse(path.substr(1));
    }
}

type FsErrorKeys = Exclude<keyof FsError, 'name'>;
type FsNewProps = (error: FsError) => {[K in FsErrorKeys]?: FsError[K]};

function editFsError<T>(result: FsResult<T>, newProps: FsNewProps): FsResult<T>;
function editFsError<T>(result: FsPromiseResult<T>, newProps: FsNewProps): FsPromiseResult<T>;
function editFsError<T>(
    result: FsResult<T> | FsPromiseResult<T>,
    newPropsCb: FsNewProps,
): FsResult<T> | FsPromiseResult<T> {
    if (result instanceof Promise) {
        return result
            .then((result) => editFsError(result, newPropsCb));
    } else {
        return result
            .inspectErr((error) => {
                const newProps = newPropsCb(error);

                for (const key in newProps) {
                    (error as any)[key] = newProps[key as FsErrorKeys];
                }
            });
    }
}

export class InMemoryFs extends InMemoryFsImpl implements Fs {
    public async chmod(path: string, mode: number): FsPromiseResult<void> {
        return editFsError(
            super.chmod(path, mode),
            (error) => ({
                message: `${error.message}, chmod '${path}' '${mode}'`,
                path,
            }),
        );
    }

    public createReadStream(path: string): FsResult<NodeJS.ReadableStream> {
        return editFsError(
            super.createReadStream(path),
            (error) => ({
                message: `${error.message}, createReadStream '${path}'`,
                path,
            }),
        );
    }

    public createWriteStream(path: string): FsResult<NodeJS.WritableStream> {
        return editFsError(
            super.createWriteStream(path),
            (error) => ({
                message: `${error.message}, createWriteStream '${path}'`,
                path,
            }),
        );
    }

    public async deleteFile(path: string): FsPromiseResult<void> {
        return editFsError(
            super.deleteFile(path),
            (error) => ({
                message: `${error.message}, deleteFile '${path}'`,
                path,
            }),
        );
    }

    public async deleteDir(path: string): FsPromiseResult<void> {
        return editFsError(
            super.deleteDir(path),
            (error) => ({
                message: `${error.message}, deleteDir '${path}'`,
                path,
            }),
        );
    }

    public async exists(path: string): Promise<boolean> {
        return super.exists(path);
    }

    public async mkdir(path: string): FsPromiseResult<void> {
        return editFsError(
            super.mkdir(path),
            (error) => ({
                message: `${error.message}, mkdir '${path}'`,
                path,
            }),
        );
    }

    public async read(path: string): FsPromiseResult<string> {
        return editFsError(
            super.read(path),
            (error) => ({
                message: `${error.message}, read '${path}'`,
                path,
            }),
        );
    }

    public async readdir(path: string): FsPromiseResult<string[]> {
        return editFsError(
            super.readdir(path),
            (error) => ({
                message: `${error.message}, readdir '${path}'`,
                path,
            }),
        );
    }

    public async rename(from: string, to: string): FsPromiseResult<void> {
        return editFsError(
            super.rename(from, to),
            (error) => ({
                message: `${error.message}, rename '${from}' '${to}'`,
            }),
        );
    }

    public async stat(path: string): FsPromiseResult<InMemoryFsStats> {
        return editFsError(
            super.stat(path),
            (error) => ({
                message: `${error.message}, stat '${path}'`,
                path,
            }),
        );
    }

    public async write(path: string, contents: string): FsPromiseResult<void> {
        return editFsError(
            super.write(path, contents),
            (error) => ({
                message: `${error.message}, write '${path}'`,
                path,
            }),
        );
    }

    public async copy(from: string, to: string, customOpts?: CopyOptions): FsPromiseResult<void> {
        return editFsError(
            super.copy(from, to, customOpts),
            (error) => ({
                message: `${error.message}, copy '${from}' '${to}'`,
            }),
        );
    }

    public async copyFile(from: string, to: string, customOpts?: CopyOptions): FsPromiseResult<void> {
        return editFsError(
            super.copyFile(from, to, customOpts),
            (error) => ({
                message: `${error.message}, copyFile '${from}' '${to}'`,
            }),
        );
    }

    public async mkdirp(path: string): FsPromiseResult<void> {
        return editFsError(
            super.mkdirp(path),
            (error) => ({
                message: `${error.message}, mkdirp '${path}'`,
                path,
            }),
        );
    }

    public async remove(path: string): FsPromiseResult<void> {
        return editFsError(
            super.remove(path),
            (error) => ({
                message: `${error.message}, remove '${path}'`,
                path,
            }),
        );
    }

    public async walkDown(path: string, cb: WalkCallback, customOpts?: WalkOptions): FsPromiseResult<void> {
        return editFsError(
            super.walkDown(path, cb, customOpts),
            (error) => ({
                message: `${error.message}, walkDown '${path}'`,
                path,
            }),
        );
    }

    public async walkUp(path: string, cb: WalkCallback, customOpts?: WalkOptions): FsPromiseResult<void> {
        return editFsError(
            super.walkUp(path, cb, customOpts),
            (error) => ({
                message: `${error.message}, walkUp '${path}'`,
                path,
            }),
        );
    }
}
