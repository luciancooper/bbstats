const { teamData, teamInfo, teamMap } = require('../../db'),
    GameStats = require('../../sim/GameStats'),
    StatIndexer = require('../../sim/StatIndexer'),
    { ChunkedJSON, ChunkedCSV } = require('../chunked');

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

async function info(req, res, next) {
    res.json(await teamInfo(req.params));
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

function games(type, statKeys) {
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
    data,
    info,
    season,
    games,
};