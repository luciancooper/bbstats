/* eslint-disable max-len */
const { rosterMap } = require('../../db'),
    HandedStats = require('../../sim/HandedStats'),
    StatIndexer = require('../../sim/StatIndexer');

function season(type, statKeys, pitchersOnly = false) {
    const indexer = new StatIndexer(...statKeys),
        rosCallback = pitchersOnly
            ? ({ p }) => (p ? indexer.emptySet(2) : null)
            : () => indexer.emptySet(2);
    // return controller
    return async (req, res, next) => {
        const sim = new HandedStats();
        let stats = await rosterMap(req.params, rosCallback);
        if (req.params.team) {
            const { team } = req.params;
            stats = stats[team];
            // register stat callback
            sim.addListener(type, ({ tid, pid, hand }, keys) => {
                if (tid === team) indexer.apply(stats[pid][hand], ...keys);
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
                        head = `year,team,pid,hand,${indexer.keys.join(',')}\n`,
                        csv = Object.entries(stats).flatMap(([pid, [rhand, lhand]]) => [`${year},${team},${pid},0,${rhand.join(',')}\n`, `${year},${team},${pid},1,${lhand.join(',')}\n`]).join('');
                    return res.set('Content-Type', 'text/csv').send(head + csv);
                }
                // error 406
                default:
                    return next(406);
            }
        } else {
            // register stat callback
            sim.addListener(type, ({ tid, pid, hand }, keys) => {
                indexer.apply(stats[tid][pid][hand], ...keys);
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
                        head = `year,team,pid,hand,${indexer.keys.join(',')}\n`,
                        csv = Object.entries(stats).map(([team, roster]) => Object.entries(roster).flatMap(([pid, [rhand, lhand]]) => [`${year},${team},${pid},0,${rhand.join(',')}\n`, `${year},${team},${pid},1,${lhand.join(',')}\n`]).join('')).join('');
                    return res.set('Content-Type', 'text/csv').send(head + csv);
                }
                // error 406
                default:
                    return next(406);
            }
        }
    };
}

module.exports = {
    season,
};