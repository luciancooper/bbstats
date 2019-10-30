const GameSim = require('../../sim/GameSim'),
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

module.exports = {
    scores,
};