import { Readable, Writable } from 'stream';
import { Http, HttpRequest, HttpResponse } from '..';
import { defer } from '../../../classes/promise';

export type HttpHandler = (url: string, method: string, data?: string) => string;

export class CallbackHttpResponse extends Readable implements HttpResponse {
    private readonly response: string;

    constructor(response: string) {
        super();

        this.response = response;
    }

    public _read() {
        this.push(this.response);
        this.push(null);
    }

    public intoString(): Promise<string> {
        return Promise.resolve(this.response);
    }
}

export class CallbackHttpRequest extends Writable implements HttpRequest {
    private readonly url: string;
    private readonly method: string;
    private readonly handler: HttpHandler;
    private data?: string;

    constructor(url: string, method: string, handler: HttpHandler) {
        super();

        this.url = url;
        this.method = method;
        this.handler = handler;
    }

    public _write(chunk: any, encoding: string, cb: () => void) {
        if (this.data === undefined) {
            this.data = '';
        }

        this.data += chunk.toString();

        cb();
    }

    public _final(cb: () => void) {
        cb();
    }

    public async getResponse(): Promise<CallbackHttpResponse> {
        const {promise, resolve, reject} = defer();

        this.on('finish', resolve);
        this.on('error', reject);

        this.end();

        await promise;

        const result = this.handler(this.url, this.method, this.data);
        return new CallbackHttpResponse(result);
    }
}

export class CallbackHttp implements Http {
    private readonly handler: HttpHandler;

    constructor(handler: HttpHandler) {
        this.handler = handler;
    }

    public get(url: string): CallbackHttpRequest {
        return new CallbackHttpRequest(url, 'GET', this.handler);
    }
}
