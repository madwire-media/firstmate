import { Readable, Writable } from 'stream';
import { Http, HttpRequest, HttpResponse } from '..';
import { unimplementedFn } from '../../../util/container/mock';

export class UnimplementedHttp implements Http {
    public get = unimplementedFn('get');
}

export class UnimplementedHttpRequest extends Writable implements HttpRequest {
    public getResponse = unimplementedFn('getResponse');
}

export class UnimplementedHttpResponse extends Readable implements HttpResponse {
    public intoString = unimplementedFn('intoString');
}
