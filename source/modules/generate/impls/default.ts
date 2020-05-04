import { Generate } from '..';

// cspell:disable
const lowerAlphaNum = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');
// cspell:enable

function createIdGenerator(len: number, chars: string[]) {
    const charsLen = chars.length;

    return () => {
        let output = '';

        for (let i = 0; i < len; i += 1) {
            output += chars[Math.floor(Math.random() * charsLen)];
        }

        return output;
    };
}

export class DefaultGenerate implements Generate {
    public uniqueId = createIdGenerator(8, lowerAlphaNum);

    public uniqueSession = createIdGenerator(3, lowerAlphaNum);

    public uniqueTmpFile = createIdGenerator(3, lowerAlphaNum);
}
