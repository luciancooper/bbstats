/* eslint-disable import/no-extraneous-dependencies */
const { MongoClient } = require('mongodb'),
    chalk = require('chalk');

// configure env
require('dotenv').config();

console.log('Testing database connection...');

MongoClient.connect(process.env.DATABASE_URL, {
    poolSize: process.env.POOL_SIZE || 5,
    useNewUrlParser: true,
    useUnifiedTopology: true,
}, async (err, client) => {
    if (err) {
        console.log(chalk`{cyan Database connection test}: {red failed}`);
        console.log(chalk`  {red ${err.name}}: {yellow ${err.message}}`);
    } else {
        console.log(chalk`{cyan Database connection test}: {green success}`);
        console.log(chalk`  {yellow host}: {cyan ${client.s.options.srvHost}}`);
        console.log(chalk`  {yellow database}: {cyan ${client.s.options.dbName}}`);
        const collections = (await client.db().collections()).map((c) => c.s.namespace.collection);
        console.log(chalk`  {yellow collections}:`, collections.length ? collections.map((c) => chalk`{cyan ${c}}`).join(' , ') : chalk`{bold None}`);
        client.close();
    }
    process.exit(0);
});