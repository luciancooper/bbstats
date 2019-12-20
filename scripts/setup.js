/* eslint-disable import/no-extraneous-dependencies */
const inquirer = require('inquirer'),
    chalk = require('chalk'),
    ora = require('ora'),
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
        ].join('\n'),
        spinner = ora(chalk`Creating {yellow {bold .env}} file`).start();
    // create .env file
    fs.writeFile('.env', env, (error) => {
        if (error) {
            spinner.fail(chalk`Failed to create {yellow {bold .env}} file`);
        } else {
            spinner.succeed(chalk`Created {yellow {bold .env}} file`);
        }
    });
});