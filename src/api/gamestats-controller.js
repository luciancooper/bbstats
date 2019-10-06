const gameData = require('../db/games'),
    GameStats = require('../sim/GameStats'),
    StatIndexer = require('../sim/StatIndexer'),
    ChunkedResponse = require('./chunked');

const bstatIndexer = new StatIndexer('O', 'E', 'S', 'D', 'T', 'HR', 'BB', 'IBB', 'HBP', 'K', 'I', 'SH', 'SF', 'GDP', 'R', 'RBI', 'SB', 'CS', 'PO');

async function gamesBatting(req, res, next) {
    const sim = new GameStats(),
        chunked = new ChunkedResponse(res),
        stat = bstatIndexer.emptySet(2);
    sim.addListener('bstat', ({ t }, keys) => {
        bstatIndexer.apply(stat[t], ...keys);
    });
    await gameData(req.params).each((game) => {
        stat.forEach((a) => a.fill(0));
        sim.simGame(game);
        chunked.write({
            gid: sim.gid,
            team: sim.teams[0],
            stat: stat[0],
        });
        chunked.write({
            gid: sim.gid,
            team: sim.teams[1],
            stat: stat[1],
        });
    });
    chunked.end();
}

const pstatIndexer = new StatIndexer('W', 'L', 'SV', 'IP', 'BF', 'R', 'ER', 'S', 'D', 'T', 'HR', 'BB', 'HBP', 'IBB', 'K', 'BK', 'WP', 'PO', 'GDP');

async function gamesPitching(req, res, next) {
    const sim = new GameStats(),
        chunked = new ChunkedResponse(res),
        stat = pstatIndexer.emptySet(2);
    sim.addListener('pstat', ({ t }, keys) => {
        pstatIndexer.apply(stat[t], ...keys);
    });
    await gameData(req.params).each((game) => {
        stat.forEach((a) => a.fill(0));
        sim.simGame(game);
        chunked.write({
            gid: sim.gid,
            team: sim.teams[0],
            stat: stat[0],
        });
        chunked.write({
            gid: sim.gid,
            team: sim.teams[1],
            stat: stat[1],
        });
    });
    chunked.end();
}

const dstatIndexer = new StatIndexer('UR', 'TUR', 'P', 'A', 'E', 'PB');

async function gamesDefense(req, res, next) {
    const sim = new GameStats(),
        chunked = new ChunkedResponse(res),
        stat = dstatIndexer.emptySet(2);
    sim.addListener('dstat', ({ t }, keys) => {
        dstatIndexer.apply(stat[t], ...keys);
    });
    await gameData(req.params).each((game) => {
        stat.forEach((a) => a.fill(0));
        sim.simGame(game);
        chunked.write({
            gid: sim.gid,
            team: sim.teams[0],
            stat: stat[0],
        });
        chunked.write({
            gid: sim.gid,
            team: sim.teams[1],
            stat: stat[1],
        });
    });
    chunked.end();
}

module.exports = {
    gamesBatting,
    gamesPitching,
    gamesDefense,
};