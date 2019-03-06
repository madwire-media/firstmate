import { Http } from '..';
import { OsError } from '../../os';
import { CallbackHttp } from './callback';

export interface Endpoints {
    [url: string]: EndpointCallback | string;
}
export type EndpointCallback = (method: string, data?: string) => string;

export class StaticHttp extends CallbackHttp implements Http {
    private endpoints: Endpoints;

    constructor(endpoints: Endpoints) {
        const handler = (url: string, method: string, data?: string): string => {
            const endpoint = this.endpoints[url];

            if (endpoint === undefined) {
                const msg = `Test route not implemented: '${url}'`;

                fail(msg);
                throw new OsError({
                    message: msg,
                    code: 'EHOSTUNREACH',
                });
            }

            if (typeof endpoint === 'string') {
                return endpoint;
            } else {
                return endpoint(method, data);
            }
        };

        super(handler);

        this.endpoints = endpoints;
    }
}
