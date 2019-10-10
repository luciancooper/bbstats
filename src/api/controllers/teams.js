const teamData = require('../../db/teams'),
    gameData = require('../../db/games'),
    GameStats = require('../../sim/GameStats'),
    StatIndexer = require('../../sim/StatIndexer');

async function data(req, res, next) {
    try {
        const teams = await teamData(req.params).array();
        return res.status(200).json(teams);
    } catch (e) {
        return next(e);
    }
}

const bstatIndexer = new StatIndexer('O', 'E', 'S', 'D', 'T', 'HR', 'BB', 'IBB', 'HBP', 'K', 'I', 'SH', 'SF', 'GDP', 'R', 'RBI', 'SB', 'CS', 'PO');

async function batting(req, res, next) {
    const sim = new GameStats(),
        stats = await teamData(req.params).reduce((acc, { team }) => {
            acc[team] = bstatIndexer.emptySet();
            return acc;
        }, {});
    await sim.simStats(
        'bstat',
        gameData(req.params),
        ({ tid }, keys) => {
            bstatIndexer.apply(stats[tid], ...keys);
        },
    );
    res.status(200).json(Object.keys(stats).map((team) => ({ team, stats: stats[team] })));
}

const pstatIndexer = new StatIndexer('W', 'L', 'SV', 'IP', 'BF', 'R', 'ER', 'S', 'D', 'T', 'HR', 'BB', 'HBP', 'IBB', 'K', 'BK', 'WP', 'PO', 'GDP');

async function pitching(req, res, next) {
    const sim = new GameStats(),
        stats = await teamData(req.params).reduce((acc, { team }) => {
            acc[team] = pstatIndexer.emptySet();
            return acc;
        }, {});
    await sim.simStats(
        'pstat',
        gameData(req.params),
        ({ tid }, keys) => {
            pstatIndexer.apply(stats[tid], ...keys);
        },
    );
    res.status(200).json(Object.keys(stats).map((team) => ({ team, stats: stats[team] })));
}

const dstatIndexer = new StatIndexer('UR', 'TUR', 'P', 'A', 'E', 'PB');

async function defense(req, res, next) {
    const sim = new GameStats(),
        stats = await teamData(req.params).reduce((acc, { team }) => {
            acc[team] = dstatIndexer.emptySet();
            return acc;
        }, {});
    await sim.simStats(
        'dstat',
        gameData(req.params),
        ({ tid }, keys) => {
            dstatIndexer.apply(stats[tid], ...keys);
        },
    );
    res.status(200).json(Object.keys(stats).map((team) => ({ team, stats: stats[team] })));
}

module.exports = {
    data,
    batting,
    pitching,
    defense,
};