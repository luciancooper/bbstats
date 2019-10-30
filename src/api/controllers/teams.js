const { teamData, teamMap } = require('../../db'),
    GameStats = require('../../sim/GameStats'),
    StatIndexer = require('../../sim/StatIndexer');

async function data(req, res, next) {
    let teams;
    try {
        teams = await teamData(req.params).array();
    } catch (e) {
        return next(e);
    }
    switch (req.accepts(['json', 'csv'])) {
        // json response
        case 'json':
            return res.json(teams);
        // csv response
        case 'csv': {
            const { year } = req.params,
                head = 'year,team,league\n',
                csv = teams.map(({ team, league }) => `${year},${team},${league}\n`).join('');
            return res.set('Content-Type', 'text/csv').send(head + csv);
        }
        // error 406
        default:
            return next(406);
    }
}

function season(type, statKeys) {
    const indexer = new StatIndexer(...statKeys);
    return async (req, res, next) => {
        const sim = new GameStats(),
            stats = await teamMap(req.params, () => indexer.emptySet());
        // register stat callback
        sim.addListener(type, ({ tid }, keys) => {
            indexer.apply(stats[tid], ...keys);
        });
        // sim games
        await sim.simGames(req.params);
        // determine response type
        switch (req.accepts(['json', 'csv'])) {
            // json response
            case 'json':
                return res.json(Object.keys(stats).map((team) => ({ team, stats: stats[team] })));
            // csv response
            case 'csv': {
                const { year } = req.params,
                    head = `year,team,${indexer.keys.join(',')}\n`,
                    csv = Object.entries(stats).map(([team, stat]) => `${year},${team},${stat.join(',')}\n`).join('');
                return res.set('Content-Type', 'text/csv').send(head + csv);
            }
            // error 406
            default:
                return next(406);
        }
    };
}

module.exports = {
    data,
    season,
};