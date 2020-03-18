module.exports = {
    all: true,
    'check-coverage': false,
    include: [
        'modules/**/*.ts',
    ],
    exclude: [
        'modules/**/*.mock.ts',
        'modules/**/mock.ts',
        'modules/**/*.test.ts',
    ],
    reporter: [
        'text',
        'lcov',
    ],
}
