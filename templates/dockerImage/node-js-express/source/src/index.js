const errorHandler = require('errorhandler');

const app = require('./app');

if (process.env.NODE_ENV === 'development') {
    app.use(errorHandler());
}

const server = app.listen(app.get('port'), () => {
    console.log(`  Node.js express JS server launched and listening on port ${app.get('port')}`);
    console.log(`  Press Ctrl+C to stop`);
    console.log();
});

module.exports = server;
