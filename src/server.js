const express = require('express'),
    bodyParser = require('body-parser'),
    app = express();

// configure env
require('dotenv').config();

// setup body parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ports
const PORT = process.env.PORT || 3000;

// routes
app.get('/', (req, res) => {
    res.send('bbstats api');
});

// listen
app.listen(PORT, () => console.log(`App listening on port ${PORT}`));