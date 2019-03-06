import { Fs } from '..';
import { unimplemented } from '../../../util/container/mock';

export class UnimplementedFs implements Fs {
    public copy(): any {
        return unimplemented();
    }
    public copyFile(): any {
        return unimplemented();
    }
    public mkdirp(): any {
        return unimplemented();
    }
    public remove(): any {
        return unimplemented();
    }
    public walkDown(): any {
        return unimplemented();
    }
    public walkUp(): any {
        return unimplemented();
    }
    public chmod(): any {
        return unimplemented();
    }
    public createReadStream(): any {
        return unimplemented();
    }
    public createWriteStream(): any {
        return unimplemented();
    }
    public deleteFile(): any {
        return unimplemented();
    }
    public deleteDir(): any {
        return unimplemented();
    }
    public exists(): any {
        return unimplemented();
    }
    public mkdir(): any {
        return unimplemented();
    }
    public read(): any {
        return unimplemented();
    }
    public readdir(): any {
        return unimplemented();
    }
    public rename(): any {
        return unimplemented();
    }
    public stat(): any {
        return unimplemented();
    }
    public write(): any {
        return unimplemented();
    }
}
