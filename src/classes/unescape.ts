export function unescape(str: string) {
    let output = '';
    const singleCharEscapes: {
        [raw: string]: string,
    } = {
        b: '\b',
        f: '\f',
        n: '\n',
        r: '\r',
        t: '\t',
        v: '\v',
        0: '\0',
    };
    // 'bfnrtv0\'"\\';

    while (true) {
        const slash = str.indexOf('\\');

        if (slash === -1) {
            break;
        }

        output += str.substr(0, slash);
        str = str.substr(slash);

        if (!str[1]) {
            // Theoretically this is impossible, but we'll handle it anyway
            // This means the string ended with a '\'
            break;
        } else if (str[1] in singleCharEscapes) {
            // Single character escapes

            output += singleCharEscapes[str[1]];
            str = str.substr(2);
        } else if (str[1] === 'x') {
            // Hex escapes

            // output += parseSequence(str.substring(1, 4));
            output += String.fromCharCode(parseInt(str.substring(2, 4), 16));
            str = str.substr(4);
        } else if (str[1] === 'u') {
            // Unicode escapes

            if (str[2] === '{') {
                const otherBracket = str.indexOf('}');
                try {
                    output += String.fromCodePoint(parseInt(str.substring(3, otherBracket), 16));
                } catch (error) {
                    output += '?';
                }
                str = str.substr(otherBracket + 1);
            } else {
                output += String.fromCharCode(parseInt(str.substring(2, 6), 16));
                str = str.substr(6);
            }
        } else {
            // Not an escape - ignore

            output += str[1];
            str = str.substr(2);
        }
    }

    output += str;

    return output;
}
