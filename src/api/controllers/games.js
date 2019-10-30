const GameSim = require('../../sim/GameSim'),
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
    // sim games
    await new GameSim().simScores(
        req.params,
        gamecb,
    );
    chunked.close();
}

function stats(type, statKeys) {
    const indexer = new StatIndexer(...statKeys);
    return async (req, res, next) => {
        const sim = new GameStats();
        let chunked,
            gamecb;
        if (req.params.team) {
            const stat = indexer.emptySet(),
                { team } = req.params;
            // register stat callback
            sim.addListener(type, ({ tid }, keys) => {
                if (tid === team) indexer.apply(stat, ...keys);
            });
            // determine response type
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
                    chunked = new ChunkedCSV(res).open('gid', 'team', ...indexer.keys);
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
            const stat = indexer.emptySet(2);
            // register stat callback
            sim.addListener(type, ({ t }, keys) => {
                indexer.apply(stat[t], ...keys);
            });
            // determine response type
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
                    chunked = new ChunkedCSV(res).open('gid', 'team', ...indexer.keys);
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
        // sim games
        await sim.simGames(
            req.params,
            gamecb,
        );
        chunked.close();
    };
}

module.exports = {
    scores,
    stats,
};