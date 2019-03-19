import { Fs } from '..';
import { unimplementedFn } from '../../../util/container/mock';

export class UnimplementedFs implements Fs {
    public copy = unimplementedFn('copy');
    public copyFile = unimplementedFn('copyFile');
    public mkdirp = unimplementedFn('mkdirp');
    public remove = unimplementedFn('remove');
    public walkDown = unimplementedFn('walkDown');
    public walkUp = unimplementedFn('walkUp');
    public chmod = unimplementedFn('chmod');
    public createReadStream = unimplementedFn('createReadStream');
    public createWriteStream = unimplementedFn('createWriteStream');
    public deleteFile = unimplementedFn('deleteFile');
    public deleteDir = unimplementedFn('deleteDir');
    public exists = unimplementedFn('exists');
    public mkdir = unimplementedFn('mkdir');
    public read = unimplementedFn('read');
    public readdir = unimplementedFn('readdir');
    public rename = unimplementedFn('rename');
    public stat = unimplementedFn('stat');
    public write = unimplementedFn('write');
}
