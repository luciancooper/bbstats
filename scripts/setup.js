/* eslint-disable import/no-extraneous-dependencies */
const inquirer = require('inquirer'),
    chalk = require('chalk'),
    fs = require('fs');

inquirer.prompt([
    {
        name: 'port',
        message: 'Default Port',
        type: 'number',
        default: 3000,
    },
    {
        name: 'mongoConnection',
        message: 'Database Connection String',
        type: 'string',
    },
    {
        name: 'poolSize',
        message: 'MongoDb Pool Size',
        type: 'number',
        default: 5,
    },
]).then((spec) => {
    const env = [
        `PORT=${spec.port}`,
        `DATABASE_URL=${spec.mongoConnection}`,
        `POOL_SIZE=${spec.poolSize}`,
    ].join('\n');

    console.log(chalk`writing {yellow .env} file...`);
    fs.writeFile('.env', env, (error) => {
        console.log(chalk`wrote {yellow .env} file`);
    });
});