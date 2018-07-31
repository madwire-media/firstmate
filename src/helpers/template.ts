import { Transform, TransformOptions } from 'stream';

export function processTemplateS(data: string, vars: {[key: string]: string}): string {
    let index;

    for (const key in vars) {
        const value = vars[key];
        const tkey = `[[${key}]]`;

        index = data.indexOf(tkey);

        while (index >= 0) {
            data = data.substr(0, index) + value + data.substr(index + tkey.length);

            index = data.indexOf(tkey, index - tkey.length + value.length);
        }
    }

    return data;
}
export function processTemplateB(data: Buffer, vars: {[key: string]: string}): Buffer {
    let index;

    for (const key in vars) {
        const value = Buffer.from(vars[key]);
        const tkey = Buffer.from(`[[${key}]]`);

        index = data.indexOf(tkey);

        while (index >= 0) {
            data = Buffer.concat([data.slice(0, index), value, data.slice(index + tkey.length)]);

            index = data.indexOf(tkey, index - tkey.length + value.length);
        }
    }

    return data;
}

export interface TemplateProcessorOptions extends TransformOptions {
    vars: {[key: string]: string};
}

export class TemplateProcessor extends Transform {
    private buf = Buffer.alloc(0);
    private vars: {[key: string]: string};
    private maxKeyLen: number;

    constructor(options: TemplateProcessorOptions) {
        super(options);

        this.vars = options.vars;

        let maxVarLen = 0;

        for (const key in options.vars) {
            if (!/[a-zA-Z0-9_.-]/.test(key)) {
                throw new TypeError(`Invalid key '${key}'`);
            }

            maxVarLen = Math.max(maxVarLen, options.vars[key].length);
        }

        this.maxKeyLen = maxVarLen;
    }

    public _transform(chunk: string | Buffer | any, encoding: string, callback: () => void) {
        let chunkB;

        if (chunk instanceof Buffer) {
            chunkB = chunk;
        } else if (typeof chunk === 'string') {
            chunkB = Buffer.from(chunk, encoding);
        } else if (chunk instanceof Array) {
            chunkB = Buffer.from(chunk);
        } else {
            chunkB = Buffer.from(chunk.toString());
        }

        this.buf = Buffer.concat([this.buf, chunkB]);

        const lastTemplateStart = this.buf.lastIndexOf('[[');
        const lastTemplateEnd = this.buf.lastIndexOf(']]');

        // Try and grab as much parsable data as possible
        let newData;
        if (
            lastTemplateEnd > lastTemplateStart ||
            lastTemplateStart < this.buf.length - this.maxKeyLen + 2
        ) {
            newData = this.buf;
            this.buf = Buffer.alloc(0);
        } else {
            newData = this.buf.slice(0, lastTemplateStart);
            this.buf = this.buf.slice(lastTemplateStart);
        }

        // Parse any new data
        if (newData.length > 0) {
            this.push(processTemplateB(newData, this.vars));
        } else {
            this.push(Buffer.alloc(0));
        }

        callback();
    }

    public _flush(callback: () => void) {
        this.push(processTemplateB(this.buf, this.vars));
        callback();
    }
}
