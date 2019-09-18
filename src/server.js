const express = require('express'),
    bodyParser = require('body-parser'),
    morgan = require('morgan'),
    cors = require('cors'),
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

// listen
app.listen(PORT, () => console.log(`App listening on port ${PORT}`));