/* eslint-disable import/no-extraneous-dependencies */
const chalk = require('chalk'),
    ora = require('ora'),
    { initPool } = require('../src/db/service'),
    { unzip } = require('../src/rs');

// configure env
require('dotenv').config();

function fmtTime(seconds) {
    const sec = seconds % 60,
        min = Math.floor((seconds / 60) % 60),
        hour = Math.floor((seconds / 3600) % 24);
    return hour
        ? `${hour}h ${min}m`
        : min
            ? `${min}m ${sec}s`
            : `${sec}s`;
}

// parse input years
const years = [...new Set([...process.argv[2].split(',').flatMap((a) => {
    if (!a.includes('-')) {
        return Number(a);
    }
    const [y0, y1] = a.split('-').map((v) => Number(v)),
        yspan = [];
    for (let y = y0; y <= y1; yspan.push(y), y += 1);
    return yspan;
})])].sort();

console.log(chalk`{bold populating database with games from}`, years.map((y) => chalk`{bold {yellow ${y}}}`).join(', '));

// connect to database
initPool(async (err) => {
    if (err) {
        console.log(`Database connection error: ${err}`);
        process.exit(1);
    }
    for (let i = 0, year, spinner, time, log; i < years.length; i += 1) {
        year = years[i];
        time = process.hrtime();
        spinner = ora({
            prefixText: chalk`{bold {yellow ${year}}}`,
            text: chalk`{bold Fetching data}`,
        }).start();
        // unzip the specified year
        log = await new Promise((resolve) => {
            const report = {};
            unzip(year, report, ({ type, path }) => {
                spinner.text = chalk`{bold Unzipping ${type} file {cyan ${path}}}`;
            }).on('finish', () => {
                spinner.succeed(chalk`{bold Unzipped in ${fmtTime(...process.hrtime(time))}}`);
                resolve(report);
            });
        });
        // output a log of changes to the database
        console.log(Object.entries(log).flatMap(([group, {
            files,
            modified,
            inserted,
            deleted,
        }]) => [
            chalk`{bold {cyan ${group}}} (${files.length} Files)`,
            ...(deleted ? [chalk`  ${deleted} {bold {red Deleted}}`] : []),
            ...(modified ? [chalk`  ${modified} {bold {yellow Modified}}`] : []),
            ...(inserted ? [chalk`  ${inserted} {bold {green Inserted}}`] : []),
        ]).map((l) => `  ${l}`).join('\n'));
    }
    process.exit(0);
});