import { Transform, TransformOptions } from 'stream';
import { TemplateVars, validKeyRgx } from '.';
import { processTemplate } from './static';

export interface TemplateProcessorOptions extends TransformOptions {
    vars: TemplateVars;
}

export class TemplateProcessor extends Transform {
    private buf = Buffer.alloc(0);
    private readonly vars: TemplateVars;
    private readonly maxKeyLen: number = 0;

    constructor(options: TemplateProcessorOptions) {
        super(options);

        this.vars = {...options.vars};

        for (const key in options.vars) {
            if (!validKeyRgx.test(key)) {
                throw new TypeError(`Invalid key '${key}'`);
            }

            this.maxKeyLen = Math.max(this.maxKeyLen, key.length);
        }
    }

    public _transform(chunk: Buffer, encoding: string, callback: () => void) {
        this.buf = Buffer.concat([this.buf, chunk]);

        const lastTagStart = this.buf.lastIndexOf('[[');
        const lastTagEnd = this.buf.lastIndexOf(']]');

        let newData: Buffer;

        // Try and grab as much parsable data as possible
        if (lastTagStart >= 0) {
            if (
                lastTagStart > lastTagEnd &&
                lastTagStart + (this.maxKeyLen + 4) > this.buf.length
            ) {
                // Grab up to the beginning of the last tag, since it could be unfinished
                newData = this.buf.slice(0, lastTagStart);
                this.buf = this.buf.slice(lastTagStart);
            } else {
                // Grab up to 2 before the buffer end, or to last tag's end, whichever's last
                const end = Math.max(lastTagEnd + 2, this.buf.length - 2);

                newData = this.buf.slice(0, end);
                this.buf = this.buf.slice(end);
            }
        } else {
            // Grab up to 2 before the buffer end
            const end = Math.max(0, this.buf.length - 2);

            newData = this.buf.slice(0, end);
            this.buf = this.buf.slice(end);
        }

        // Parse any new data
        if (newData.length > 0) {
            this.push(processTemplate(newData, this.vars));
        }

        callback();
    }

    public _flush(callback: () => void) {
        this.push(processTemplate(this.buf, this.vars));
        callback();
    }
}
