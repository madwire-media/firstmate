const express = require('express');
const compression = require('compression');
const helmet = require('helmet');

// Create Express server
const app = express();

// Express configuration
app.set('port', process.env.PORT || (process.env.DOCKER === 'true' ? 80 : 3000));
app.use(compression()); // This is incompatible with some primivitve HTTP clients, feel free to remove
app.use(helmet());

app.get('/', (req, res) => {
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.end('(⌐■_■) #Yeeeaaahhh Boi!!!!!!!');
});

module.exports = app;
