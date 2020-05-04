import fs from 'fs';

const colors = {
    g: '253',
    d: '172',
    i: '222',
    c: '160',
    o: '202',
    p: '184',
    k: '148',
    s: '186',
};

export function printRum() {
    const charLines = fs.readFileSync(`${__dirname}/../../../art/rum.raw.txt`, 'utf8').split('\n');
    const colorMapLines = fs.readFileSync(`${__dirname}/../../../art/rum.color.txt`, 'utf8').split('\n');

    let currentColor;

    let processed = '';

    for (let i = 0; i < charLines.length; i += 1) {
        const chars = `${charLines[i]}\n`;
        const colorMap = `${colorMapLines[i]}\n`;

        for (let j = 0; j < chars.length; j += 1) {
            let newColor: keyof typeof colors | undefined = colorMap[j] as keyof typeof colors;

            if (!(newColor in colors)) {
                newColor = undefined;
            }

            if (newColor !== currentColor) {
                currentColor = newColor;
                if (newColor) {
                    processed += `\x1b[38;5;${colors[newColor]}m`;
                } else {
                    processed += '\x1b[0m';
                }
            }

            processed += chars[j];
        }
    }

    // eslint-disable-next-line no-console
    console.log(processed.trimRight());
}
