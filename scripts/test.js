/* eslint-disable import/no-extraneous-dependencies */
const { MongoClient } = require('mongodb'),
    chalk = require('chalk'),
    ora = require('ora');

// configure env
require('dotenv').config();

const spinner = ora(chalk`{bold Testing mongodb connection...}`).start();

MongoClient.connect(process.env.DATABASE_URL, {
    poolSize: process.env.POOL_SIZE || 5,
    useNewUrlParser: true,
    useUnifiedTopology: true,
}, async (err, client) => {
    if (err) {
        spinner.fail(chalk`{bold mongodb connection test} {bold {red failed}}`);
        console.log(chalk`  {red ${err.name}}: {yellow ${err.message}}`);
    } else {
        spinner.succeed(chalk`{bold mongodb connection test} {bold {green succeeded}}`);
        const { srvHost, dbName } = client.s.options,
            collections = (await client.db().collections()).map((c) => c.s.namespace.collection);
        console.log(chalk`  {yellow {bold host}}:`, srvHost ? chalk`{cyan {bold ${srvHost}}}` : chalk`{bold None}`);
        console.log(chalk`  {yellow {bold database}}: {cyan {bold ${dbName}}}`);
        console.log(chalk`  {yellow {bold collections}}:`, collections.length ? collections.map((c) => chalk`{cyan {bold ${c}}}`).join(', ') : chalk`{bold None}`);
        client.close();
    }
    process.exit(0);
});