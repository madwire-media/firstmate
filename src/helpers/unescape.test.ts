import { unescape } from './unescape';

describe('unescaping strings', () => {
    test('single character escapes', () => {
        const input = '\\b\\f\\n\\r\\t\\v\\0\\\\';

        const result = unescape(input);

        expect(result).toBe('\b\f\n\r\t\v\0\\');
    });

    test('hex escapes', () => {
        const input = '\\x00\\x1b\\xff';

        const result = unescape(input);

        expect(result).toBe('\0\x1b\xff');
    });

    test('unicode escapes', () => {
        const input = '\\u0000\\u{0}\\u{fffff}\\u{ffffffff}';

        const result = unescape(input);

        expect(result).toBe('\0\0\u{fffff}?');
    });

    test('unfinished escape', () => {
        const input = '\\0\\';

        const result = unescape(input);

        expect(result).toBe('\0\\');
    });
});
