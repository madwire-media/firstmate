module.exports = {
    require: [
        './util/ts-node-register.js',
        'source-map-support/register'
    ],
    watchFiles: [
        'modules/**/*.ts'
    ]
}
