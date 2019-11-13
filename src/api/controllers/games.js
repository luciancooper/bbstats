const GameSim = require('../../sim/GameSim'),
    { gameInfo, gameLineups, teamList } = require('../../db'),
    { ChunkedJSON, ChunkedCSV } = require('../chunked');

async function scores(req, res, next) {
    let chunked,
        gamecb;
    if (req.params.team) {
        const { team } = req.params,
            standings = [0, 0];
        switch (req.accepts(['json', 'csv'])) {
            // json response
            case 'json': {
                chunked = new ChunkedJSON(res).open();
                gamecb = ({ gid, awayGameNumber, homeGameNumber }, { score, lob }) => {
                    const teams = [gid.slice(11, 14), gid.slice(8, 11)],
                        t = teams.indexOf(team),
                        gameNumber = [awayGameNumber, homeGameNumber][t];
                    chunked.write({
                        gid,
                        team,
                        gameNumber,
                        opp: teams[t ^ 1],
                        home: t,
                        score: score[t],
                        opp_score: score[t ^ 1],
                        lob: lob[t],
                        wins: standings[0],
                        losses: standings[1],
                    });
                    // update team standings
                    standings[score[t] > score[t ^ 1] ? 0 : 1] += 1;
                };
                break;
            }
            // csv response
            case 'csv': {
                chunked = new ChunkedCSV(res).open('gid', 'team', 'gameNumber', 'opp', 'home', 'score', 'opp_score', 'lob', 'wins', 'losses');
                gamecb = ({ gid, awayGameNumber, homeGameNumber }, { score, lob }) => {
                    const teams = [gid.slice(11, 14), gid.slice(8, 11)],
                        t = teams.indexOf(team),
                        gameNumber = [awayGameNumber, homeGameNumber][t];
                    chunked.write([gid, team, gameNumber, teams[t ^ 1], t, score[t], score[t ^ 1], lob[t], ...standings].join(','));
                    // update team standings
                    standings[score[t] > score[t ^ 1] ? 0 : 1] += 1;
                };
                break;
            }
            // error 406
            default:
                return void next(406);
        }
    } else {
        const standings = (await teamList(req.params)).reduce((acc, t) => {
            acc[t] = [0, 0];
            return acc;
        }, {});
        switch (req.accepts(['json', 'csv'])) {
            // json response
            case 'json': {
                chunked = new ChunkedJSON(res).open();
                gamecb = ({ gid, awayGameNumber, homeGameNumber }, { score, lob }) => {
                    const gameNumber = [awayGameNumber, homeGameNumber];
                    chunked.write(...[gid.slice(11, 14), gid.slice(8, 11)].map((team, t, teams) => {
                        const [wins, losses] = standings[team];
                        // update standings for team
                        standings[team][score[t] > score[t ^ 1] ? 0 : 1] += 1;
                        return ({
                            gid,
                            team,
                            gameNumber: gameNumber[t],
                            opp: teams[t ^ 1],
                            home: t,
                            score: score[t],
                            opp_score: score[t ^ 1],
                            lob: lob[t],
                            wins,
                            losses,
                        });
                    }));
                };
                break;
            }
            // csv response
            case 'csv': {
                chunked = new ChunkedCSV(res).open('gid', 'team', 'gameNumber', 'opp', 'home', 'score', 'opp_score', 'lob', 'wins', 'losses');
                gamecb = ({ gid, awayGameNumber, homeGameNumber }, { score, lob }) => {
                    const gameNumber = [awayGameNumber, homeGameNumber];
                    chunked.write(...[gid.slice(11, 14), gid.slice(8, 11)].map((team, t, teams) => {
                        const [wins, losses] = standings[team];
                        // update standings for team
                        standings[team][score[t] > score[t ^ 1] ? 0 : 1] += 1;
                        return [gid, team, gameNumber[t], teams[t ^ 1], t, score[t], score[t ^ 1], lob[t], wins, losses].join(',');
                    }));
                };
                break;
            }
            // error 406
            default:
                return void next(406);
        }
    }
    // sim games
    await new GameSim().simScores(
        req.params,
        gamecb,
    );
    chunked.close();
}

async function info(req, res, next) {
    let docs;
    try {
        docs = await gameInfo(req.params).array();
    } catch (e) {
        return next(e);
    }
    switch (req.accepts(['json', 'csv'])) {
        // json response
        case 'json':
            return res.json(docs);
        // csv response
        case 'csv': {
            const head = 'gid,team,gameNumber,opp,home,site,pitcher,opp_pitcher\n',
                csv = docs.map(({
                    gid,
                    team,
                    gameNumber,
                    opponent,
                    home,
                    site,
                    startingPitcher,
                    opponentStartingPitcher,
                }) => `${gid},${team},${gameNumber},${opponent},${home ? 1 : 0},${site},${startingPitcher},${opponentStartingPitcher}\n`).join('');
            return res.set('Content-Type', 'text/csv').send(head + csv);
        }
        // error 406
        default:
            return next(406);
    }
}

async function lineups(req, res, next) {
    const docs = gameLineups(req.params);
    let chunked;
    switch (req.accepts(['json', 'csv'])) {
        // json response
        case 'json':
            chunked = new ChunkedJSON(res).open();
            await docs.each((data) => {
                chunked.write(data);
            });
            break;
        // csv response
        case 'csv': {
            chunked = new ChunkedCSV(res).open('gid', 'team', 'gameNumber', 'pitcher', ...[1, 2, 3, 4, 5, 6, 7, 8, 9].flatMap((i) => [`pid${i}`, `pos${i}`]));
            await docs.each(({
                gid,
                team,
                gameNumber,
                pitcher,
                lineup,
            }) => {
                chunked.write([gid, team, gameNumber, pitcher, ...lineup.flatMap(({ pid, pos }) => [pid, pos])].join(','));
            });
            break;
        }
        // error 406
        default:
            return void next(406);
    }
    // close chunked response
    chunked.close();
}

module.exports = {
    scores,
    info,
    lineups,
};