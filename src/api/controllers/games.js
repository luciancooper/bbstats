const GameSim = require('../../sim/GameSim'),
    { gameInfo, teamList } = require('../../db'),
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
                gamecb = ({ gid }, { score, lob }) => {
                    const teams = [gid.slice(11, 14), gid.slice(8, 11)],
                        t = teams.indexOf(team);
                    chunked.write({
                        gid,
                        team,
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
                chunked = new ChunkedCSV(res).open('gid', 'team', 'opp', 'home', 'score', 'opp_score', 'lob', 'wins', 'losses');
                gamecb = ({ gid }, { score, lob }) => {
                    const teams = [gid.slice(11, 14), gid.slice(8, 11)],
                        t = teams.indexOf(team);
                    chunked.write([gid, team, teams[t ^ 1], t, score[t], score[t ^ 1], lob[t], ...standings].join(','));
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
                gamecb = ({ gid }, { score, lob }) => {
                    chunked.write(...[gid.slice(11, 14), gid.slice(8, 11)].map((team, t, teams) => {
                        const [wins, losses] = standings[team];
                        // update standings for team
                        standings[team][score[t] > score[t ^ 1] ? 0 : 1] += 1;
                        return ({
                            gid,
                            team,
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
                chunked = new ChunkedCSV(res).open('gid', 'team', 'opp', 'home', 'score', 'opp_score', 'lob', 'wins', 'losses');
                gamecb = ({ gid }, { score, lob }) => {
                    chunked.write(...[gid.slice(11, 14), gid.slice(8, 11)].map((team, t, teams) => {
                        const [wins, losses] = standings[team];
                        // update standings for team
                        standings[team][score[t] > score[t ^ 1] ? 0 : 1] += 1;
                        return [gid, team, teams[t ^ 1], t, score[t], score[t ^ 1], lob[t], wins, losses].join(',');
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
            const head = 'gid,team,gn,opp,home,site,pitcher,opp_pitcher\n',
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

module.exports = {
    scores,
    info,
};