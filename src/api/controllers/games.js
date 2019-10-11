const gameData = require('../../db/games'),
    GameSim = require('../../sim/GameSim'),
    GameStats = require('../../sim/GameStats'),
    StatIndexer = require('../../sim/StatIndexer'),
    ChunkedResponse = require('../chunked');

async function scores(req, res, next) {
    const sim = new GameSim(),
        chunked = new ChunkedResponse(res);
    await sim.simScores(
        gameData(req.params),
        ({ gid }, { score }) => {
            chunked.write({ gid, score });
        },
    );
    chunked.end();
}

const bstatIndexer = new StatIndexer('O', 'E', 'S', 'D', 'T', 'HR', 'BB', 'IBB', 'HBP', 'K', 'I', 'SH', 'SF', 'GDP', 'R', 'RBI', 'SB', 'CS', 'PO');

async function batting(req, res, next) {
    const sim = new GameStats(),
        chunked = new ChunkedResponse(res);
    if (req.params.team) {
        const stat = bstatIndexer.emptySet(),
            { team } = req.params;
        await sim.simStats(
            'bstat',
            gameData(req.params),
            ({ tid }, keys) => {
                if (tid === team) bstatIndexer.apply(stat, ...keys);
            },
            ({ gid }) => {
                chunked.write({ gid, team, stat });
                stat.fill(0);
            },
        );
    } else {
        const stat = bstatIndexer.emptySet(2);
        await sim.simStats(
            'bstat',
            gameData(req.params),
            ({ t }, keys) => {
                bstatIndexer.apply(stat[t], ...keys);
            },
            ({ gid, away, home }) => {
                chunked.write(
                    { gid, team: away, stats: stat[0] },
                    { gid, team: home, stats: stat[1] },
                );
                stat.forEach((a) => a.fill(0));
            },
        );
    }
    chunked.end();
}

const pstatIndexer = new StatIndexer('W', 'L', 'SV', 'IP', 'BF', 'R', 'ER', 'S', 'D', 'T', 'HR', 'BB', 'HBP', 'IBB', 'K', 'BK', 'WP', 'PO', 'GDP');

async function pitching(req, res, next) {
    const sim = new GameStats(),
        chunked = new ChunkedResponse(res);
    if (req.params.team) {
        const stat = pstatIndexer.emptySet(),
            { team } = req.params;
        await sim.simStats(
            'pstat',
            gameData(req.params),
            ({ tid }, keys) => {
                if (tid === team) pstatIndexer.apply(stat, ...keys);
            },
            ({ gid }) => {
                chunked.write({ gid, team, stat });
                stat.fill(0);
            },
        );
    } else {
        const stat = pstatIndexer.emptySet(2);
        await sim.simStats(
            'pstat',
            gameData(req.params),
            ({ t }, keys) => {
                pstatIndexer.apply(stat[t], ...keys);
            },
            ({ gid, away, home }) => {
                chunked.write(
                    { gid, team: away, stats: stat[0] },
                    { gid, team: home, stats: stat[1] },
                );
                stat.forEach((a) => a.fill(0));
            },
        );
    }
    chunked.end();
}

const dstatIndexer = new StatIndexer('UR', 'TUR', 'P', 'A', 'E', 'PB');

async function defense(req, res, next) {
    const sim = new GameStats(),
        chunked = new ChunkedResponse(res);
    if (req.params.team) {
        const stat = dstatIndexer.emptySet(),
            { team } = req.params;
        await sim.simStats(
            'dstat',
            gameData(req.params),
            ({ tid }, keys) => {
                if (tid === team) dstatIndexer.apply(stat, ...keys);
            },
            ({ gid }) => {
                chunked.write({ gid, team, stat });
                stat.fill(0);
            },
        );
    } else {
        const stat = dstatIndexer.emptySet(2);
        await sim.simStats(
            'dstat',
            gameData(req.params),
            ({ t }, keys) => {
                dstatIndexer.apply(stat[t], ...keys);
            },
            ({ gid, away, home }) => {
                chunked.write(
                    { gid, team: away, stats: stat[0] },
                    { gid, team: home, stats: stat[1] },
                );
                stat.forEach((a) => a.fill(0));
            },
        );
    }
    chunked.end();
}

module.exports = {
    scores,
    batting,
    pitching,
    defense,
};