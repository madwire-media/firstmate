import * as http from 'http';
import * as https from 'https';

import { Readable, Writable } from 'stream';
import { Http, HttpRequest, HttpResponse } from '..';
import { defer } from '../../../classes/promise';

export class NodeHttpRequest extends Writable implements HttpRequest {
    private readonly parent: Writable;
    private readonly response: Promise<HttpResponse>;

    constructor(parent: Writable, response: Promise<HttpResponse>) {
        super();
        this.response = response;
        this.parent = parent;
    }

    public _destroy(error: Error, callback: (error?: Error) => void): void {
        this.parent._destroy(error, callback);
    }

    public _final(callback: (error?: Error) => void): void {
        this.parent._final(callback);
    }

    public _write(chunk: any, encoding: string, callback: (error?: Error) => void): void {
        this.parent._write(chunk, encoding, callback);
    }

    public _writev?(chunks: { chunk: any, encoding: string }[], callback: (error?: Error | null) => void): void {
        this.parent._writev(chunks, callback);
    }

    public getResponse(): Promise<HttpResponse> {
        return this.response;
    }
}

export class NodeHttpResponse extends Readable implements HttpResponse {
    private readonly parent: Readable;

    constructor(parent: Readable) {
        super();

        this.parent = parent;
    }

    public _destroy(error: Error, callback: (error?: Error) => void): void {
        this.parent._destroy(error, callback);
    }

    public _read(size: number): void {
        this.parent._read(size);
    }

    public intoString(): Promise<string> {
        let out = '';

        this.on('data', (chunk) => out += chunk.toString('utf8'));

        return new Promise((resolve, reject) => {
            this.on('end', () => resolve(out));
            this.on('error', reject);
        });
    }
}

export class NodeHttp implements Http {
    public get(url: string): NodeHttpRequest {
        let method: typeof http | typeof https;

        if (/^http:\/\//.test(url)) {
            method = http;
        } else if (/^https:\/\//.test(url)) {
            method = https;
        } else {
            throw new TypeError('Not a valid http/https url');
        }

        const {promise, resolve, reject} = defer<HttpResponse>();

        const request = method.get(url, (response) => resolve(new NodeHttpResponse(response)));
        request.on('error', reject);

        return new NodeHttpRequest(request, promise);
    }
}
