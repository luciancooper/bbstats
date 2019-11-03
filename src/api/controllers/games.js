const GameSim = require('../../sim/GameSim'),
    { gameInfo } = require('../../db'),
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