/* eslint-disable max-len */
const { rosterMap } = require('../../db'),
    HandedStats = require('../../sim/HandedStats'),
    StatIndexer = require('../../sim/StatIndexer');

const bstatIndexer = new StatIndexer('O', 'E', 'S', 'D', 'T', 'HR', 'BB', 'IBB', 'HBP', 'K', 'I', 'SH', 'SF', 'GDP', 'RBI');

async function batting(req, res, next) {
    const sim = new HandedStats();
    let stats = await rosterMap(req.params, () => bstatIndexer.emptySet(2));
    if (req.params.team) {
        const { team } = req.params;
        stats = stats[team];
        // register stat callback
        sim.addListener('bstat', ({ tid, pid, hand }, keys) => {
            if (tid === team) bstatIndexer.apply(stats[pid][hand], ...keys);
        });
        // sim games
        await sim.simGames(req.params);
        // determine response type
        switch (req.accepts(['json', 'csv'])) {
            // json response
            case 'json':
                return res.json(Object.entries(stats).map(([pid, [rhand, lhand]]) => ({
                    team,
                    pid,
                    rhand,
                    lhand,
                })));
            // csv response
            case 'csv': {
                const { year } = req.params,
                    head = `year,team,pid,hand,${bstatIndexer.keys.join(',')}\n`,
                    csv = Object.entries(stats).flatMap(([pid, [rhand, lhand]]) => [`${year},${team},${pid},0,${rhand.join(',')}\n`, `${year},${team},${pid},1,${lhand.join(',')}\n`]).join('');
                return res.set('Content-Type', 'text/csv').send(head + csv);
            }
            // error 406
            default:
                return next(406);
        }
    } else {
        // register stat callback
        sim.addListener('bstat', ({ tid, pid, hand }, keys) => {
            bstatIndexer.apply(stats[tid][pid][hand], ...keys);
        });
        // sim games
        await sim.simGames(req.params);
        // determine response type
        switch (req.accepts(['json', 'csv'])) {
            // json response
            case 'json': {
                return res.json(Object.entries(stats).flatMap(([team, r]) => Object.entries(r).map(([pid, [rhand, lhand]]) => ({
                    team,
                    pid,
                    rhand,
                    lhand,
                }))));
            }
            // csv response
            case 'csv': {
                const { year } = req.params,
                    head = `year,team,pid,hand,${bstatIndexer.keys.join(',')}\n`,
                    csv = Object.entries(stats).map(([team, roster]) => Object.entries(roster).flatMap(([pid, [rhand, lhand]]) => [`${year},${team},${pid},0,${rhand.join(',')}\n`, `${year},${team},${pid},1,${lhand.join(',')}\n`]).join('')).join('');
                return res.set('Content-Type', 'text/csv').send(head + csv);
            }
            // error 406
            default:
                return next(406);
        }
    }
}

const pstatIndexer = new StatIndexer('IP', 'BF', 'S', 'D', 'T', 'HR', 'BB', 'HBP', 'IBB', 'K', 'BK', 'WP', 'PO', 'GDP');

async function pitching(req, res, next) {
    const sim = new HandedStats();
    let stats = await rosterMap(req.params, ({ p }) => (p ? pstatIndexer.emptySet(2) : null));
    if (req.params.team) {
        const { team } = req.params;
        stats = stats[team];
        // register stat callback
        sim.addListener('pstat', ({ tid, pid, hand }, keys) => {
            if (tid === team) pstatIndexer.apply(stats[pid][hand], ...keys);
        });
        // sim games
        await sim.simGames(req.params);
        // determine reponse type
        switch (req.accepts(['json', 'csv'])) {
            // json response
            case 'json':
                return res.json(Object.entries(stats).map(([pid, [rhand, lhand]]) => ({
                    team,
                    pid,
                    rhand,
                    lhand,
                })));
            // csv response
            case 'csv': {
                const { year } = req.params,
                    head = `year,team,pid,hand,${pstatIndexer.keys.join(',')}\n`,
                    csv = Object.entries(stats).flatMap(([pid, [rhand, lhand]]) => [`${year},${team},${pid},0,${rhand.join(',')}\n`, `${year},${team},${pid},1,${lhand.join(',')}\n`]).join('');
                return res.set('Content-Type', 'text/csv').send(head + csv);
            }
            // error 406
            default:
                return next(406);
        }
    } else {
        // register stat callback
        sim.addListener('pstat', ({ tid, pid, hand }, keys) => {
            pstatIndexer.apply(stats[tid][pid][hand], ...keys);
        });
        // sim games
        await sim.simGames(req.params);
        // determine response type
        switch (req.accepts(['json', 'csv'])) {
            // json response
            case 'json': {
                return res.json(Object.entries(stats).flatMap(([team, r]) => Object.entries(r).map(([pid, [rhand, lhand]]) => ({
                    team,
                    pid,
                    rhand,
                    lhand,
                }))));
            }
            // csv response
            case 'csv': {
                const { year } = req.params,
                    head = `year,team,pid,hand,${pstatIndexer.keys.join(',')}\n`,
                    csv = Object.entries(stats).map(([team, roster]) => Object.entries(roster).flatMap(([pid, [rhand, lhand]]) => [`${year},${team},${pid},0,${rhand.join(',')}\n`, `${year},${team},${pid},1,${lhand.join(',')}\n`]).join('')).join('');
                return res.set('Content-Type', 'text/csv').send(head + csv);
            }
            // error 406
            default:
                return next(406);
        }
    }
}

module.exports = {
    batting,
    pitching,
};