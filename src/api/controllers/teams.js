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

const bstatIndexer = new StatIndexer('O', 'E', 'S', 'D', 'T', 'HR', 'BB', 'IBB', 'HBP', 'K', 'I', 'SH', 'SF', 'GDP', 'R', 'RBI', 'SB', 'CS', 'PO');

async function batting(req, res, next) {
    const sim = new GameStats(),
        stats = await teamMap(req.params, () => bstatIndexer.emptySet());
    // register stat callback
    sim.addListener('bstat', ({ tid }, keys) => {
        bstatIndexer.apply(stats[tid], ...keys);
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
                head = `year,team,${bstatIndexer.keys.join(',')}\n`,
                csv = Object.entries(stats).map(([team, stat]) => `${year},${team},${stat.join(',')}\n`).join('');
            return res.set('Content-Type', 'text/csv').send(head + csv);
        }
        // error 406
        default:
            return next(406);
    }
}

const pstatIndexer = new StatIndexer('W', 'L', 'SV', 'IP', 'BF', 'R', 'ER', 'S', 'D', 'T', 'HR', 'BB', 'HBP', 'IBB', 'K', 'BK', 'WP', 'PO', 'GDP');

async function pitching(req, res, next) {
    const sim = new GameStats(),
        stats = await teamMap(req.params, () => pstatIndexer.emptySet());
    // register stat callback
    sim.addListener('pstat', ({ tid }, keys) => {
        pstatIndexer.apply(stats[tid], ...keys);
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
                head = `year,team,${pstatIndexer.keys.join(',')}\n`,
                csv = Object.entries(stats).map(([team, stat]) => `${year},${team},${stat.join(',')}\n`).join('');
            return res.set('Content-Type', 'text/csv').send(head + csv);
        }
        // error 406
        default:
            return next(406);
    }
}

const dstatIndexer = new StatIndexer('UR', 'TUR', 'P', 'A', 'E', 'PB');

async function defense(req, res, next) {
    const sim = new GameStats(),
        stats = await teamMap(req.params, () => dstatIndexer.emptySet());
    // register stat callback
    sim.addListener('dstat', ({ tid }, keys) => {
        dstatIndexer.apply(stats[tid], ...keys);
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
                head = `year,team,${dstatIndexer.keys.join(',')}\n`,
                csv = Object.entries(stats).map(([team, stat]) => `${year},${team},${stat.join(',')}\n`).join('');
            return res.set('Content-Type', 'text/csv').send(head + csv);
        }
        // error 406
        default:
            return next(406);
    }
}

module.exports = {
    data,
    batting,
    pitching,
    defense,
};