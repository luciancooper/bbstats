const gameData = require('../../db/games'),
    GameSim = require('../../sim/GameSim'),
    GameStats = require('../../sim/GameStats'),
    StatIndexer = require('../../sim/StatIndexer'),
    { ChunkedJSON, ChunkedCSV } = require('../chunked');

async function scores(req, res, next) {
    let chunked,
        gamecb;
    switch (req.accepts(['json', 'csv'])) {
    // json response
    case 'json': {
        chunked = new ChunkedJSON(res).open();
        gamecb = ({ gid }, { score }) => {
            chunked.write({ gid, score });
        };
        break;
    }
    // csv response
    case 'csv': {
        chunked = new ChunkedCSV(res).open('gid', 'away', 'home');
        gamecb = ({ gid }, { score }) => {
            chunked.write(`${gid},${score[0]},${score[1]}`);
        };
        break;
    }
    // error 406
    default:
        return void next(406);
    }
    // run sims
    await new GameSim().simScores(
        gameData(req.params),
        gamecb,
    );
    chunked.close();
}

const bstatIndexer = new StatIndexer('O', 'E', 'S', 'D', 'T', 'HR', 'BB', 'IBB', 'HBP', 'K', 'I', 'SH', 'SF', 'GDP', 'R', 'RBI', 'SB', 'CS', 'PO');

async function batting(req, res, next) {
    let chunked,
        statcb,
        gamecb;
    if (req.params.team) {
        const stat = bstatIndexer.emptySet(),
            { team } = req.params;
        // stat callback
        statcb = ({ tid }, keys) => {
            if (tid === team) bstatIndexer.apply(stat, ...keys);
        };
        switch (req.accepts(['json', 'csv'])) {
        // json response
        case 'json':
            chunked = new ChunkedJSON(res).open();
            gamecb = ({ gid }) => {
                chunked.write({ gid, team, stat });
                stat.fill(0);
            };
            break;
        // csv response
        case 'csv':
            chunked = new ChunkedCSV(res).open('gid', 'team', ...bstatIndexer.keys);
            gamecb = ({ gid }) => {
                chunked.write(`${gid},${team},${stat.join(',')}`);
                stat.fill(0);
            };
            break;
        // error 406
        default:
            return void next(406);
        }
    } else {
        const stat = bstatIndexer.emptySet(2);
        statcb = ({ t }, keys) => {
            bstatIndexer.apply(stat[t], ...keys);
        };
        switch (req.accepts(['json', 'csv'])) {
        // json response
        case 'json':
            chunked = new ChunkedJSON(res).open();
            gamecb = ({ gid, away, home }) => {
                chunked.write(
                    { gid, team: away, stats: stat[0] },
                    { gid, team: home, stats: stat[1] },
                );
                stat.forEach((a) => a.fill(0));
            };
            break;
        // csv response
        case 'csv':
            chunked = new ChunkedCSV(res).open('gid', 'team', ...bstatIndexer.keys);
            gamecb = ({ gid, away, home }) => {
                chunked.write(
                    `${gid},${away},${stat[0].join(',')}`,
                    `${gid},${home},${stat[1].join(',')}`,
                );
                stat.forEach((a) => a.fill(0));
            };
            break;
        // error 406
        default:
            return void next(406);
        }
    }
    // run sim
    await new GameStats().simStats(
        'bstat',
        gameData(req.params),
        statcb,
        gamecb,
    );
    chunked.close();
}

const pstatIndexer = new StatIndexer('W', 'L', 'SV', 'IP', 'BF', 'R', 'ER', 'S', 'D', 'T', 'HR', 'BB', 'HBP', 'IBB', 'K', 'BK', 'WP', 'PO', 'GDP');

async function pitching(req, res, next) {
    let chunked,
        statcb,
        gamecb;
    if (req.params.team) {
        const stat = pstatIndexer.emptySet(),
            { team } = req.params;
        // stat callback
        statcb = ({ tid }, keys) => {
            if (tid === team) pstatIndexer.apply(stat, ...keys);
        };
        switch (req.accepts(['json', 'csv'])) {
        // json response
        case 'json':
            chunked = new ChunkedJSON(res).open();
            gamecb = ({ gid }) => {
                chunked.write({ gid, team, stat });
                stat.fill(0);
            };
            break;
        // csv response
        case 'csv':
            chunked = new ChunkedCSV(res).open('gid', 'team', ...pstatIndexer.keys);
            gamecb = ({ gid }) => {
                chunked.write(`${gid},${team},${stat.join(',')}`);
                stat.fill(0);
            };
            break;
        // error 406
        default:
            return void next(406);
        }
    } else {
        const stat = pstatIndexer.emptySet(2);
        statcb = ({ t }, keys) => {
            pstatIndexer.apply(stat[t], ...keys);
        };
        switch (req.accepts(['json', 'csv'])) {
        // json response
        case 'json':
            chunked = new ChunkedJSON(res).open();
            gamecb = ({ gid, away, home }) => {
                chunked.write(
                    { gid, team: away, stats: stat[0] },
                    { gid, team: home, stats: stat[1] },
                );
                stat.forEach((a) => a.fill(0));
            };
            break;
        // csv response
        case 'csv':
            chunked = new ChunkedCSV(res).open('gid', 'team', ...pstatIndexer.keys);
            gamecb = ({ gid, away, home }) => {
                chunked.write(
                    `${gid},${away},${stat[0].join(',')}`,
                    `${gid},${home},${stat[1].join(',')}`,
                );
                stat.forEach((a) => a.fill(0));
            };
            break;
        // error 406
        default:
            return void next(406);
        }
    }
    // run sim
    await new GameStats().simStats(
        'pstat',
        gameData(req.params),
        statcb,
        gamecb,
    );
    chunked.close();
}

const dstatIndexer = new StatIndexer('UR', 'TUR', 'P', 'A', 'E', 'PB');

async function defense(req, res, next) {
    let chunked,
        statcb,
        gamecb;
    if (req.params.team) {
        const stat = dstatIndexer.emptySet(),
            { team } = req.params;
        // stat callback
        statcb = ({ tid }, keys) => {
            if (tid === team) dstatIndexer.apply(stat, ...keys);
        };
        switch (req.accepts(['json', 'csv'])) {
        // json response
        case 'json':
            chunked = new ChunkedJSON(res).open();
            gamecb = ({ gid }) => {
                chunked.write({ gid, team, stat });
                stat.fill(0);
            };
            break;
        // csv response
        case 'csv':
            chunked = new ChunkedCSV(res).open('gid', 'team', ...dstatIndexer.keys);
            gamecb = ({ gid }) => {
                chunked.write(`${gid},${team},${stat.join(',')}`);
                stat.fill(0);
            };
            break;
        // error 406
        default:
            return void next(406);
        }
    } else {
        const stat = dstatIndexer.emptySet(2);
        statcb = ({ t }, keys) => {
            dstatIndexer.apply(stat[t], ...keys);
        };
        switch (req.accepts(['json', 'csv'])) {
        // json response
        case 'json':
            chunked = new ChunkedJSON(res).open();
            gamecb = ({ gid, away, home }) => {
                chunked.write(
                    { gid, team: away, stats: stat[0] },
                    { gid, team: home, stats: stat[1] },
                );
                stat.forEach((a) => a.fill(0));
            };
            break;
        // csv response
        case 'csv':
            chunked = new ChunkedCSV(res).open('gid', 'team', ...dstatIndexer.keys);
            gamecb = ({ gid, away, home }) => {
                chunked.write(
                    `${gid},${away},${stat[0].join(',')}`,
                    `${gid},${home},${stat[1].join(',')}`,
                );
                stat.forEach((a) => a.fill(0));
            };
            break;
        // error 406
        default:
            return void next(406);
        }
    }
    // run sim
    await new GameStats().simStats(
        'dstat',
        gameData(req.params),
        statcb,
        gamecb,
    );
    chunked.close();
}

module.exports = {
    scores,
    batting,
    pitching,
    defense,
};