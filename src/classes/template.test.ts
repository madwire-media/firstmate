import * as template from './template';

describe('process template', () => {
    describe('string input', () => {
        test('empty data', () => {
            const data = '';
            const vars = {};

            const result = template.processTemplateS(data, vars);

            expect(result).toBe('');
        });

        test('single replacement', () => {
            const data = 'Have you ever had a dream, [[chosen one]], that you were so sure was real?';
            const vars = {
                'chosen one': 'Neo',
            };

            const result = template.processTemplateS(data, vars);

            expect(result).toBe('Have you ever had a dream, Neo, that you were so sure was real?');
        });

        test('multiple replacements', () => {
            const data = 'You believe the year is [[now]] when in fact it is much closer to [[real now]].';
            const vars = {
                'now': '1997',
                'real now': '2197',
            };

            const result = template.processTemplateS(data, vars);

            expect(result).toBe('You believe the year is 1997 when in fact it is much closer to 2197.');
        });

        test('multiple duplicate replacements', () => {
            const data = "You [[a]], I [[a]] what you're [[b]], 'cause right now I'm [[b]] the same thing.";
            const vars = {
                a: 'know',
                b: 'thinking',
            };

            const result = template.processTemplateS(data, vars);

            expect(result).toBe("You know, I know what you're thinking, 'cause right now I'm thinking the same thing.");
        });
    });

    describe('buffer input', () => {
        test('empty data', () => {
            const data = Buffer.from('');
            const vars = {};

            const result = template.processTemplateB(data, vars);

            expect(result.toString()).toBe('');
        });

        test('single replacement', () => {
            const data = Buffer.from('Have you ever had a dream, [[chosen one]], that you were so sure was real?');
            const vars = {
                'chosen one': 'Neo',
            };

            const result = template.processTemplateB(data, vars);

            expect(result.toString()).toBe('Have you ever had a dream, Neo, that you were so sure was real?');
        });

        test('multiple replacements', () => {
            const data = Buffer.from('You believe the year is [[now]] when in fact it is much closer to [[real now]].');
            const vars = {
                'now': '1997',
                'real now': '2197',
            };

            const result = template.processTemplateB(data, vars);

            expect(result.toString()).toBe('You believe the year is 1997 when in fact it is much closer to 2197.');
        });

        test('multiple duplicate replacements', () => {
            const data = Buffer.from(
                "You [[a]], I [[a]] what you're [[b]], 'cause right now I'm [[b]] the same thing.",
            );
            const vars = {
                a: 'know',
                b: 'thinking',
            };

            const result = template.processTemplateB(data, vars);

            expect(result.toString())
                .toBe("You know, I know what you're thinking, 'cause right now I'm thinking the same thing.");
        });
    });

    describe('stream input', () => {
        test('empty data', () => {
            const data = '';
            const vars = {};

            let result = '';
            const t = new template.TemplateProcessor({vars});

            t.on('data', (chunk) => result += chunk);

            for (const c of data) {
                t.write(c);
            }

            t.end();

            expect(result).toBe('');
        });

        test('single replacement (characters)', () => {
            const data = 'Have you ever had a dream, [[chosen one]], that you were so sure was real?';
            const vars = {
                'chosen one': 'Neo',
            };

            let result = '';
            const t = new template.TemplateProcessor({vars});

            t.on('data', (chunk) => result += chunk);

            for (const c of data) {
                t.write(c);
            }

            t.end();

            expect(result).toBe('Have you ever had a dream, Neo, that you were so sure was real?');
        });

        test('multiple replacements (characters)', () => {
            const data = 'You believe the year is [[now]] when in fact it is much closer to [[real now]].';
            const vars = {
                'now': '1997',
                'real now': '2197',
            };

            let result = '';
            const t = new template.TemplateProcessor({vars});

            t.on('data', (chunk) => result += chunk);

            for (const c of data) {
                t.write(c);
            }

            t.end();

            expect(result).toBe('You believe the year is 1997 when in fact it is much closer to 2197.');
        });

        test('multiple duplicate replacements (characters)', () => {
            const data = "You [[a]], I [[a]] what you're [[b]], 'cause right now I'm [[b]] the same thing.";
            const vars = {
                a: 'know',
                b: 'thinking',
            };

            let result = '';
            const t = new template.TemplateProcessor({vars});

            t.on('data', (chunk) => result += chunk);

            for (const c of data) {
                t.write(c);
            }

            t.end();

            expect(result).toBe("You know, I know what you're thinking, 'cause right now I'm thinking the same thing.");
        });

        test('single replacement (chunks)', () => {
            const data = 'Have you ever had a dream, [[chosen one]], that you were so sure was real?';
            const vars = {
                'chosen one': 'Neo',
            };

            let result = '';
            const t = new template.TemplateProcessor({vars});

            t.on('data', (chunk) => result += chunk);

            let chunk = '';

            for (const c of data) {
                chunk += c;

                if (chunk.length >= 10) {
                    t.write(chunk);
                    chunk = '';
                }
            }

            t.write(chunk);
            t.end();

            expect(result).toBe('Have you ever had a dream, Neo, that you were so sure was real?');
        });

        test('multiple replacements (chunks)', () => {
            const data = 'You believe the year is [[now]] when in fact it is much closer to [[real now]].';
            const vars = {
                'now': '1997',
                'real now': '2197',
            };

            let result = '';
            const t = new template.TemplateProcessor({vars});

            t.on('data', (chunk) => result += chunk);

            let chunk = '';

            for (const c of data) {
                chunk += c;

                if (chunk.length >= 10) {
                    t.write(chunk);
                    chunk = '';
                }
            }

            t.write(chunk);
            t.end();

            expect(result).toBe('You believe the year is 1997 when in fact it is much closer to 2197.');
        });

        test('multiple duplicate replacements (chunks)', () => {
            const data = "You [[a]], I [[a]] what you're [[b]], 'cause right now I'm [[b]] the same thing.";
            const vars = {
                a: 'know',
                b: 'thinking',
            };

            let result = '';
            const t = new template.TemplateProcessor({vars});

            t.on('data', (chunk) => result += chunk);

            let chunk = '';

            for (const c of data) {
                chunk += c;

                if (chunk.length >= 10) {
                    t.write(chunk);
                    chunk = '';
                }
            }

            t.write(chunk);
            t.end();

            expect(result).toBe("You know, I know what you're thinking, 'cause right now I'm thinking the same thing.");
        });

        test('bad key', () => {
            const data = 'There is no spoon.';
            const vars = {
                '**invalid var name**': 'spoon',
            };

            expect(() => new template.TemplateProcessor({vars})).toThrow("Invalid key '**invalid var name**'");
        });
    });
});
