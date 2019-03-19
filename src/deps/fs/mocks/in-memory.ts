import * as Path from 'path';
import { Readable, Writable } from 'stream';

import {
    CopyOptions, defaultCopyOptions, defaultWalkOptions, FileMutator, Fs,
    FsError, Stats, WalkCallback, WalkOptions,
} from '..';

function enoent() {
    throw new FsError({
        code: 'ENOENT',
        message: 'no such file or directory',
    });
}

function eexist() {
    throw new FsError({
        code: 'EEXIST',
        message: 'file already exists',
    });
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

class File {
    public contents: string;
    public mode: number = 0o664;

    constructor(contents: string) {
        this.contents = contents;
    }

    public toRaw() {
        return this.contents;
    }

    public expectFile(): this {
        return this;
    }

    public expectDir(): never {
        throw new FsError({
            code: 'ENOTDIR',
            message: 'expected a directory, found a file',
        });
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

class Directory {
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

    public expectFile(): never {
        throw new FsError({
            code: 'EISDIR',
            message: 'expected a file, found a directory',
        });
    }

    public expectDir(): this {
        return this;
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

    public merge(other: Directory, clobber: boolean) {
        for (const filename in other.entities) {
            const otherEntity = other.entities[filename];

            if (filename in this.entities) {
                const thisEntity = this.entities[filename];

                if (thisEntity instanceof Directory && otherEntity instanceof Directory) {
                    thisEntity.merge(otherEntity, clobber);
                } else if (clobber) {
                    this.entities[filename] = otherEntity;
                } else {
                    eexist();
                }
            } else {
                this.entities[filename] = otherEntity;
            }
        }
    }

    public traverse(path: string): FsEntity {
        const parts = path.split('/');
        let entity: FsEntity = this;

        for (const part of parts) {
            if (part.length === 0) {
                continue;
            }

            entity = entity
                .expectDir()
                .getEntity(part);
        }

        return entity;
    }

    public mkdirp(path: string): Directory {
        const parts = path.split('/');
        let dir: Directory = this;

        for (const part of parts) {
            dir = dir.getOrCreateDirectory(part);
        }

        return dir;
    }

    public hasEntity(filename: string): boolean {
        return filename in this.entities;
    }

    public deleteEntity(filename: string): void {
        delete this.entities[filename];
    }

    public getEntity(filename: string): FsEntity {
        const entity = this.entities[filename];

        if (entity === undefined) {
            enoent();
        }

        return entity;
    }

    public getOrCreateFile(filename: string): File {
        let entity = this.entities[filename];

        if (entity === undefined) {
            entity = new File('');
            this.entities[filename] = entity;
        }

        return entity.expectFile();
    }

    public getOrCreateDirectory(filename: string): Directory {
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
    public async chmod(path: string, mode: number): Promise<void> {
        const entity = this.traverse(path);
        entity.mode = mode;
    }

    public createReadStream(path: string): NodeJS.ReadableStream {
        const {pathTo, filename} = splitPath(path);

        const dir = this.traverse(pathTo).expectDir();
        const file = dir.getEntity(filename).expectFile();

        return file.getReadStream();
    }

    public createWriteStream(path: string): NodeJS.WritableStream {
        const {pathTo, filename} = splitPath(path);

        const dir = this.traverse(pathTo).expectDir();
        const file = dir.getOrCreateFile(filename);

        return file.getWriteStream();
    }

    public async deleteFile(path: string): Promise<void> {
        const {pathTo, filename} = splitPath(path);

        const dir = this.traverse(pathTo).expectDir();
        dir.getEntity(filename).expectFile();
        dir.deleteEntity(filename);
    }

    public async deleteDir(path: string): Promise<void> {
        const {pathTo, filename} = splitPath(path);

        const dir = this.traverse(pathTo).expectDir();
        const subDir = dir.getEntity(filename).expectDir();

        if (Object.keys(subDir.entities).length > 0) {
            throw new FsError({
                code: 'ENOTEMPTY',
                message: 'directory not empty',
            });
        }

        dir.deleteEntity(filename);
    }

    public async exists(path: string): Promise<boolean> {
        try {
            this.traverse(path);
        } catch (error) {
            if (error instanceof FsError && error.isNoSuchFile()) {
                return false;
            } else {
                throw error;
            }
        }

        return true;
    }

    public async mkdir(path: string): Promise<void> {
        const {pathTo, filename} = splitPath(path);

        const dir = this.traverse(pathTo).expectDir();

        if (dir.hasEntity(filename)) {
            eexist();
        }

        dir.entities[filename] = new Directory();
    }

    public async read(path: string): Promise<string> {
        const file = this.traverse(path).expectFile();

        return file.contents;
    }

    public async readdir(path: string): Promise<string[]> {
        const dir = this.traverse(path).expectDir();

        return Object.keys(dir.entities);
    }

    public async rename(from: string, to: string): Promise<void> {
        let entity: FsEntity;

        {
            const {pathTo, filename} = splitPath(from);

            const dir = this.traverse(pathTo).expectDir();
            entity = dir.getEntity(filename);
        }

        {
            const {pathTo, filename} = splitPath(to);

            const dir = this.traverse(pathTo).expectDir();
            dir.entities[filename] = entity;
        }
    }

    public async stat(path: string): Promise<InMemoryFsStats> {
        const entity = this.traverse(path);

        return entity.stats();
    }

    public async write(path: string, contents: string): Promise<void> {
        const {pathTo, filename} = splitPath(path);

        const dir = this.traverse(pathTo).expectDir();
        const file = dir.getOrCreateFile(filename);

        file.contents = contents;
    }

    // -------------------------- Fs implementation ------------------------- //
    public async copy(from: string, to: string, customOpts?: CopyOptions): Promise<void> {
        const opts = {...defaultCopyOptions, ...customOpts};

        let entity: FsEntity;

        {
            const {pathTo, filename} = splitPath(from);

            const dir = this.traverse(pathTo).expectDir();
            entity = dir.getEntity(filename).duplicate();
        }

        if (opts.mutator !== false) {
            entity.mutate(opts.mutator, from, to);
        }

        {
            const {pathTo, filename} = splitPath(to);

            const dir = this.traverse(pathTo).expectDir();

            const dirToMerge = new Directory();
            dirToMerge.entities[filename] = entity;

            dir.merge(dirToMerge, opts.clobber);
        }
    }

    public async copyFile(from: string, to: string, customOpts?: CopyOptions): Promise<void> {
        const opts = {...defaultCopyOptions, ...customOpts};

        let file: File;

        {
            const {pathTo, filename} = splitPath(from);

            const dir = this.traverse(pathTo).expectDir();
            file = dir.getEntity(filename).expectFile().duplicate();
        }

        if (opts.mutator !== false) {
            await file.mutate(opts.mutator, from, to);
        }

        {
            const {pathTo, filename} = splitPath(to);

            const dir = this.traverse(pathTo).expectDir();

            if (dir.hasEntity(filename) && !opts.clobber) {
                eexist();
            } else {
                dir.entities[filename] = file;
            }
        }
    }

    public async mkdirp(path: string): Promise<void> {
        this.root.mkdirp(path);
    }

    public async remove(path: string): Promise<void> {
        const {pathTo, filename} = splitPath(path);

        const dir = this.traverse(pathTo).expectDir();
        dir.deleteEntity(filename);
    }

    public async walkDown(path: string, cb: WalkCallback, customOpts?: WalkOptions): Promise<void> {
        const opts = {...defaultWalkOptions, ...customOpts};

        const entity = this.traverse(path);
        entity.walk(false, cb, '.');
    }

    public async walkUp(path: string, cb: WalkCallback, customOpts?: WalkOptions): Promise<void> {
        const opts = {...defaultWalkOptions, ...customOpts};

        const entity = this.traverse(path);
        entity.walk(true, cb, '.');
    }

    // ------------------------- Methods for Testing ------------------------ //
    public toRaw(): RawFiles {
        return this.root.toRaw();
    }

    // --------------------------- Private Methods -------------------------- //
    private traverse(path: string): FsEntity {
        if (path.startsWith('/')) {
            path = Path.normalize(path.substr(1));
        } else {
            path = Path.join(this.cwd, path);
        }

        return this.root.traverse(path.substr(1));
    }
}

type FsErrorKeys = Exclude<keyof FsError, 'name'>;

function editFsError(error: any, newProps: {[K in FsErrorKeys]?: FsError[K]}): any {
    if (error instanceof FsError) {
        for (const key in newProps) {
            error[key as FsErrorKeys] = newProps[key as FsErrorKeys];
        }
    }

    return error;
}

export class InMemoryFs extends InMemoryFsImpl implements Fs {
    public async chmod(path: string, mode: number): Promise<void> {
        try {
            return await super.chmod(path, mode);
        } catch (error) {
            throw editFsError(error, {
                message: `${error.message}, chmod '${path}' '${mode}'`,
                path,
            });
        }
    }

    public createReadStream(path: string): NodeJS.ReadableStream {
        try {
            return super.createReadStream(path);
        } catch (error) {
            throw editFsError(error, {
                message: `${error.message}, createReadStream '${path}'`,
                path,
            });
        }
    }

    public createWriteStream(path: string): NodeJS.WritableStream {
        try {
            return super.createWriteStream(path);
        } catch (error) {
            throw editFsError(error, {
                message: `${error.message}, createWriteStream '${path}'`,
                path,
            });
        }
    }

    public async deleteFile(path: string): Promise<void> {
        try {
            return await super.deleteFile(path);
        } catch (error) {
            throw editFsError(error, {
                message: `${error.message}, deleteFile '${path}'`,
                path,
            });
        }
    }

    public async deleteDir(path: string): Promise<void> {
        try {
            return await super.deleteDir(path);
        } catch (error) {
            throw editFsError(error, {
                message: `${error.message}, deleteDir '${path}'`,
                path,
            });
        }
    }

    public async exists(path: string): Promise<boolean> {
        try {
            return await super.exists(path);
        } catch (error) {
            throw editFsError(error, {
                message: `${error.message}, exists '${path}'`,
                path,
            });
        }
    }

    public async mkdir(path: string): Promise<void> {
        try {
            return await super.mkdir(path);
        } catch (error) {
            throw editFsError(error, {
                message: `${error.message}, mkdir '${path}'`,
                path,
            });
        }
    }

    public async read(path: string): Promise<string> {
        try {
            return await super.read(path);
        } catch (error) {
            throw editFsError(error, {
                message: `${error.message}, read '${path}'`,
                path,
            });
        }
    }

    public async readdir(path: string): Promise<string[]> {
        try {
            return await super.readdir(path);
        } catch (error) {
            throw editFsError(error, {
                message: `${error.message}, readdir '${path}'`,
                path,
            });
        }
    }

    public async rename(from: string, to: string): Promise<void> {
        try {
            return await super.rename(from, to);
        } catch (error) {
            throw editFsError(error, {
                message: `${error.message}, rename '${from}' '${to}'`,
            });
        }
    }

    public async stat(path: string): Promise<InMemoryFsStats> {
        try {
            return await super.stat(path);
        } catch (error) {
            throw editFsError(error, {
                message: `${error.message}, stat '${path}'`,
                path,
            });
        }
    }

    public async write(path: string, contents: string): Promise<void> {
        try {
            return await super.write(path, contents);
        } catch (error) {
            throw editFsError(error, {
                message: `${error.message}, write '${path}'`,
                path,
            });
        }
    }

    public async copy(from: string, to: string, customOpts?: CopyOptions): Promise<void> {
        try {
            return await super.copy(from, to, customOpts);
        } catch (error) {
            throw editFsError(error, {
                message: `${error.message}, copy '${from}' '${to}'`,
            });
        }
    }

    public async copyFile(from: string, to: string, customOpts?: CopyOptions): Promise<void> {
        try {
            return await super.copyFile(from, to, customOpts);
        } catch (error) {
            throw editFsError(error, {
                message: `${error.message}, copyFile '${from}' '${to}'`,
            });
        }
    }

    public async mkdirp(path: string): Promise<void> {
        try {
            return await super.mkdirp(path);
        } catch (error) {
            throw editFsError(error, {
                message: `${error.message}, mkdirp '${path}'`,
                path,
            });
        }
    }

    public async remove(path: string): Promise<void> {
        try {
            return await super.remove(path);
        } catch (error) {
            throw editFsError(error, {
                message: `${error.message}, remove '${path}'`,
                path,
            });
        }
    }

    public async walkDown(path: string, cb: WalkCallback, customOpts?: WalkOptions): Promise<void> {
        try {
            return await super.walkDown(path, cb, customOpts);
        } catch (error) {
            throw editFsError(error, {
                message: `${error.message}, walkDown '${path}'`,
                path,
            });
        }
    }

    public async walkUp(path: string, cb: WalkCallback, customOpts?: WalkOptions): Promise<void> {
        try {
            return await super.walkUp(path, cb, customOpts);
        } catch (error) {
            throw editFsError(error, {
                message: `${error.message}, walkUp '${path}'`,
                path,
            });
        }
    }
}
