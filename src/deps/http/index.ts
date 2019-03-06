import { Readable, Writable } from 'stream';

export interface RequiresHttp {
    http: Http;
}

export interface HttpRequest extends Writable {
    getResponse(): Promise<HttpResponse>;
}

export interface HttpResponse extends Readable {
    intoString(): Promise<string>;
}

export interface Http {
    get(url: string): HttpRequest;
}
