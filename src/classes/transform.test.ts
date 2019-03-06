import * as transform from './transform';

test('stringify props', () => {
    const data = {
        str: 'string',
        true: true,
        false: false,
        null: null,
        undefined,
        integer: 42,
        decimal: .42,
        array: ['foo', 'bar'],
        object: {greeting: 'hola'},
        stringifyableObject: {
            toString() {
                return 'This is a stringified object';
            },
        },
    };

    const result = transform.stringifyProps(data);

    expect(result).toEqual({
        str: 'string',
        true: 'true',
        false: 'false',
        null: 'null',
        undefined: 'undefined',
        integer: '42',
        decimal: '0.42',
        array: 'foo,bar',
        object: '[object Object]',
        stringifyableObject: 'This is a stringified object',
    });
});
