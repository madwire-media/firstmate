import { empty } from './empty';

describe('object emptiness test', () => {
    test('on arrays', () => {
        const notfull = [];
        const full = ['hi'];
        const emptied = ['hi'];
        const containsUndefined = [undefined];

        emptied.length = 0;

        expect(empty(notfull)).toBe(true);
        expect(empty(full)).toBe(false);
        expect(empty(emptied)).toBe(true);
        expect(empty(containsUndefined)).toBe(false);
    });

    test('on objects', () => {
        const notfull = {};
        const full = {salutation: 'hi'};
        const emptied = {salutation: 'hi'};
        const containsUndefined = {salutation: undefined};

        delete emptied.salutation;

        expect(empty(notfull)).toBe(true);
        expect(empty(full)).toBe(false);
        expect(empty(emptied)).toBe(true);
        expect(empty(containsUndefined)).toBe(false);
    });
});
