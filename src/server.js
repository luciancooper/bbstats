const express = require('express'),
    bodyParser = require('body-parser'),
    morgan = require('morgan'),
    cors = require('cors'),
    { initPool } = require('./db/service'),
    app = express();

// configure env
require('dotenv').config();

// setup body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// setup logging
app.use(morgan('dev'));

// setup cors
app.use(cors());

// ports
const PORT = process.env.PORT || 3000;

// routes
app.get('/', (req, res) => {
    res.send('bbstats api');
});

// connect to database
initPool((err) => {
    if (err) {
        console.log(`Database connection error: ${err}`);
        process.exit(1);
    }
    // listen
    app.listen(PORT, () => {
        console.log(`App listening on port ${PORT}`);
    });
});