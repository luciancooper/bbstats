const gameData = require('../db/games'),
    GameSim = require('../sim/GameSim');

async function simScores(req, res, next) {
    res.writeHead(200, {
        'Content-Type': 'application/json',
        'Transfer-Encoding': 'chunked',
    });
    let last = '{';
    await new GameSim().simGames(gameData(req.params), ({ gid }, { score }) => {
        res.write(last);
        last = `'${gid}':[${score[0]},${score[1]}],`;
    });
    res.write(`${last.slice(0, -1)}}`);
    res.end();
}

module.exports = simScores;