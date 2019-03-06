import { Readable, Writable } from 'stream';
import { Http, HttpRequest, HttpResponse } from '..';
import { unimplemented } from '../../../util/container/mock';

export class UnimplementedHttp implements Http {
    public get(): any {
        return unimplemented();
    }
}

export class UnimplementedHttpRequest extends Writable implements HttpRequest {
    public getResponse(): any {
        return unimplemented();
    }
}

export class UnimplementedHttpResponse extends Readable implements HttpResponse {
    public intoString(): any {
        return unimplemented();
    }
}
