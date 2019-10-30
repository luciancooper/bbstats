/* eslint-disable max-len */
const { rosterData, rosterMap } = require('../../db'),
    RosterStats = require('../../sim/RosterStats'),
    StatIndexer = require('../../sim/StatIndexer');

async function data(req, res, next) {
    let rosters;
    try {
        rosters = await rosterData(req.params).array();
    } catch (e) {
        return next(e);
    }
    switch (req.accepts(['json', 'csv'])) {
        // json response
        case 'json':
            return res.json(rosters.length === 1 ? rosters[0] : rosters);
        // csv response
        case 'csv': {
            const { year } = req.params,
                head = 'year,team,pid,p,bh,th\n',
                csv = rosters.map(({ team, roster }) => roster.map(({
                    pid,
                    p,
                    bh,
                    th,
                }) => `${year},${team},${pid},${p},${bh},${th}\n`).join('')).join('');
            return res.set('Content-Type', 'text/csv').send(head + csv);
        }
        // error 406
        default:
            return next(406);
    }
}

function season(type, statKeys, pitchersOnly = false) {
    const indexer = new StatIndexer(...statKeys),
        rosCallback = pitchersOnly
            ? ({ p }) => (p ? indexer.emptySet() : null)
            : () => indexer.emptySet();
    // return controller
    return async (req, res, next) => {
        const sim = new RosterStats();
        let stats = await rosterMap(req.params, rosCallback);
        if (req.params.team) {
            const { team } = req.params;
            stats = stats[team];
            // register stat callback
            sim.addListener(type, ({ tid, pid }, keys) => {
                if (tid === team) indexer.apply(stats[pid], ...keys);
            });
            // sim games
            await sim.simGames(req.params);
            // determine response type
            switch (req.accepts(['json', 'csv'])) {
                // json response
                case 'json':
                    return res.json(Object.entries(stats).map(([pid, stat]) => ({ team, pid, stat })));
                // csv response
                case 'csv': {
                    const { year } = req.params,
                        head = `year,team,pid,${indexer.keys.join(',')}\n`,
                        csv = Object.entries(stats).map(([pid, stat]) => `${year},${team},${pid},${stat.join(',')}\n`).join('');
                    return res.set('Content-Type', 'text/csv').send(head + csv);
                }
                // error 406
                default:
                    return next(406);
            }
        } else {
            // register stat callback
            sim.addListener(type, ({ tid, pid }, keys) => {
                indexer.apply(stats[tid][pid], ...keys);
            });
            // sim games
            await sim.simGames(req.params);
            // determine response type
            switch (req.accepts(['json', 'csv'])) {
                // json response
                case 'json':
                    return res.json(Object.entries(stats).flatMap(([team, r]) => Object.entries(r).map(([pid, stat]) => ({
                        team,
                        pid,
                        stat,
                    }))));
                // csv response
                case 'csv': {
                    const { year } = req.params,
                        head = `year,team,pid,${indexer.keys.join(',')}\n`,
                        csv = Object.entries(stats).map(([team, roster]) => Object.entries(roster).map(([pid, stat]) => `${year},${team},${pid},${stat.join(',')}\n`).join('')).join('');
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
    data,
    season,
};