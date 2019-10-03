const gameData = require('../db/games'),
    GameStats = require('../sim/GameStats'),
    ChunkedResponse = require('./chunked');

function statIndex(keys) {
    return keys.reduce((acc, s, i) => {
        acc[s] = i;
        return acc;
    }, { length: keys.length });
}

const indexer = {
    bstat: statIndex('O,E,S,D,T,HR,BB,IBB,HBP,K,I,SH,SF,GDP,R,RBI,SB,CS,PO'.split(',')),
    pstat: statIndex('W,L,SV,IP,BF,R,ER,S,D,T,HR,BB,HBP,IBB,K,BK,WP,PO,GDP'.split(',')),
    dstat: statIndex('UR,TUR,P,A,E,PB'.split(',')),
};

async function simGamestats(req, res, next) {
    const sim = new GameStats(),
        chunked = new ChunkedResponse(res),
        stats = Object.values(indexer).map((i) => [Array(i.length).fill(0), Array(i.length).fill(0)]);
    sim.addListener('bstat', ({ t }, keys) => {
        keys.map((k) => indexer.bstat[k]).forEach((i) => {
            stats[0][t][i] += 1;
        });
    });
    sim.addListener('pstat', ({ t }, keys) => {
        keys.map((k) => indexer.pstat[k]).forEach((i) => {
            stats[1][t][i] += 1;
        });
    });
    sim.addListener('dstat', ({ t }, keys) => {
        keys.map((k) => indexer.dstat[k]).forEach((i) => {
            stats[2][t][i] += 1;
        });
    });
    await gameData(req.params).each((game) => {
        stats.forEach((s) => {
            s[0].fill(0);
            s[1].fill(0);
        });
        sim.simGame(game);
        chunked.write({
            gid: sim.gid,
            team: sim.teams[0],
            bstat: stats[0][0],
            pstat: stats[1][0],
            dstat: stats[2][0],
        });
        chunked.write({
            gid: sim.gid,
            team: sim.teams[1],
            bstat: stats[0][1],
            pstat: stats[1][1],
            dstat: stats[2][1],
        });
    });
    chunked.end();
}

module.exports = simGamestats;