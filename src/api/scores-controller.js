const gameData = require('../db/games'),
    GameSim = require('../sim/GameSim'),
    ChunkedResponse = require('./chunked');

async function simScores(req, res, next) {
    const chunked = new ChunkedResponse(res);
    await new GameSim().simGames(gameData(req.params), ({ gid }, { score }) => {
        chunked.write({ gid, score });
    });
    chunked.end();
}

module.exports = simScores;