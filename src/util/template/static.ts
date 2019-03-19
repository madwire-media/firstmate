import { TemplateVars, validKeyRgx } from '.';

export function processTemplate(data: string, vars: TemplateVars): string;
export function processTemplate(data: Buffer, vars: TemplateVars): Buffer;
export function processTemplate(data: string | Buffer, vars: TemplateVars): string | Buffer {
    for (const key in vars) {
        if (!validKeyRgx.test(key)) {
            throw new TypeError(`Invalid key '${key}'`);
        }
    }

    if (data instanceof Buffer) {
        return processTemplateB(data, vars);
    } else {
        return processTemplateS(data, vars);
    }
}

function processTemplateS(data: string, vars: TemplateVars): string {
    let index: number;

    for (const key in vars) {
        const value = vars[key];
        const tag = `[[${key}]]`;

        index = data.indexOf(tag);

        while (index >= 0) {
            data = data.substr(0, index) + value + data.substr(index + tag.length);
            index = data.indexOf(tag, index - tag.length + value.length);
        }
    }

    return data;
}

function processTemplateB(data: Buffer, vars: TemplateVars): Buffer {
    let index: number;

    for (const key in vars) {
        const value = Buffer.from(vars[key]);
        const tag = Buffer.from(`[[${key}]]`);

        index = data.indexOf(tag);

        while (index >= 0) {
            data = Buffer.concat([data.slice(0, index), value, data.slice(index + tag.length)]);
            index = data.indexOf(tag, index - tag.length + value.length);
        }
    }

    return data;
}
