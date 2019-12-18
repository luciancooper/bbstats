/* eslint-disable import/no-extraneous-dependencies */
const chalk = require('chalk'),
    { initPool } = require('../src/db/service'),
    { unzip } = require('../src/rs');

// configure env
require('dotenv').config();

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

console.log(chalk`{bold build}:`, years);

// connect to database
initPool(async (err) => {
    if (err) {
        console.log(`Database connection error: ${err}`);
        process.exit(1);
    }
    for (let i = 0, year; i < years.length; i += 1) {
        year = years[i];
        console.log(chalk`Unzipping {bold ${year}}`);
        // unzip the specified years
        const log = await new Promise((resolve) => {
            const report = {};
            unzip(year, report).on('finish', () => {
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