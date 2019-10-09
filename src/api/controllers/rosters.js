const rosterData = require('../../db/rosters'),
    gameData = require('../../db/games'),
    RosterStats = require('../../sim/RosterStats'),
    StatIndexer = require('../../sim/StatIndexer');

async function data(req, res, next) {
    try {
        const rosters = await rosterData(req.params).array();
        return res.status(200).json(rosters.length === 1 ? rosters[0] : rosters);
    } catch (e) {
        return next(e);
    }
}

const bstatIndexer = new StatIndexer('O', 'E', 'S', 'D', 'T', 'HR', 'BB', 'IBB', 'HBP', 'K', 'I', 'SH', 'SF', 'GDP', 'R', 'RBI', 'SB', 'CS', 'PO');

async function batting(req, res, next) {
    const sim = new RosterStats(),
        stats = {};
    await rosterData(req.params).each(({ team, roster }) => {
        stats[team] = roster.reduce((acc, { pid }) => {
            acc[pid] = bstatIndexer.emptySet();
            return acc;
        }, {});
    });
    sim.addListener('bstat', ({ tid, pid }, keys) => {
        bstatIndexer.apply(stats[tid][pid], ...keys);
    });
    await gameData(req.params).each(sim.simGame, sim);
    res.status(200).json(stats);
}

const pstatIndexer = new StatIndexer('W', 'L', 'SV', 'IP', 'BF', 'R', 'ER', 'S', 'D', 'T', 'HR', 'BB', 'HBP', 'IBB', 'K', 'BK', 'WP', 'PO', 'GDP');

async function pitching(req, res, next) {
    const sim = new RosterStats(),
        stats = {};
    await rosterData(req.params).each(({ team, roster }) => {
        stats[team] = roster.reduce((acc, { pid, p }) => {
            if (p) acc[pid] = pstatIndexer.emptySet();
            return acc;
        }, {});
    });
    sim.addListener('pstat', ({ tid, pid }, keys) => {
        pstatIndexer.apply(stats[tid][pid], ...keys);
    });
    await gameData(req.params).each(sim.simGame, sim);
    res.status(200).json(stats);
}

const dstatIndexer = new StatIndexer('P', 'A', 'E', 'PB');

async function defense(req, res, next) {
    const sim = new RosterStats(),
        stats = {};
    await rosterData(req.params).each(({ team, roster }) => {
        stats[team] = roster.reduce((acc, { pid }) => {
            acc[pid] = dstatIndexer.emptySet();
            return acc;
        }, {});
    });
    sim.addListener('dstat', ({ tid, pid }, keys) => {
        dstatIndexer.apply(stats[tid][pid], ...keys);
    });
    await gameData(req.params).each(sim.simGame, sim);
    res.status(200).json(stats);
}

module.exports = {
    data,
    batting,
    pitching,
    defense,
};