const { rosterData } = require('../../db'),
    RosterStats = require('../../sim/RosterStats'),
    StatIndexer = require('../../sim/StatIndexer');

async function data(req, res, next) {
    let rosters;
    try {
        rosters = await rosterData(req.params).array();
    } catch (e) {
        return next(e);
    }
    switch (req.accepts(['json', 'csv'])) {
        // json response
        case 'json':
            return res.json(rosters.length === 1 ? rosters[0] : rosters);
        // csv response
        case 'csv': {
            const { year } = req.params,
                head = 'year,team,pid,p,bh,th\n',
                csv = rosters.map(({ team, roster }) => roster.map(({
                    pid,
                    p,
                    bh,
                    th,
                }) => `${year},${team},${pid},${p},${bh},${th}\n`).join('')).join('');
            return res.set('Content-Type', 'text/csv').send(head + csv);
        }
        // error 406
        default:
            return next(406);
    }
}

async function playerMap(params, fn) {
    const map = {};
    await rosterData(params).each(({ team, roster }) => {
        map[team] = roster.reduce((acc, player) => {
            const x = fn(player);
            if (x) acc[player.pid] = x;
            return acc;
        }, {});
    });
    return map;
}

const bstatIndexer = new StatIndexer('O', 'E', 'S', 'D', 'T', 'HR', 'BB', 'IBB', 'HBP', 'K', 'I', 'SH', 'SF', 'GDP', 'R', 'RBI', 'SB', 'CS', 'PO');

async function batting(req, res, next) {
    const sim = new RosterStats();
    let stats = await playerMap(req.params, () => bstatIndexer.emptySet());
    if (req.params.team) {
        const { team } = req.params;
        stats = stats[team];
        // register stat callback
        sim.addListener('bstat', ({ tid, pid }, keys) => {
            if (tid === team) bstatIndexer.apply(stats[pid], ...keys);
        });
        // sim games
        await sim.simGames(req.params);
        // determine response type
        switch (req.accepts(['json', 'csv'])) {
            // json response
            case 'json':
                return res.json(Object.entries(stats).map(([pid, stat]) => ({ team, pid, stat })));
            // csv response
            case 'csv': {
                const { year } = req.params,
                    head = `year,team,pid,${bstatIndexer.keys.join(',')}\n`,
                    csv = Object.entries(stats).map(([pid, stat]) => `${year},${team},${pid},${stat.join(',')}\n`).join('');
                return res.set('Content-Type', 'text/csv').send(head + csv);
            }
            // error 406
            default:
                return next(406);
        }
    } else {
        // register stat callback
        sim.addListener('bstat', ({ tid, pid }, keys) => {
            bstatIndexer.apply(stats[tid][pid], ...keys);
        });
        // sim games
        await sim.simGames(req.params);
        // determine response type
        switch (req.accepts(['json', 'csv'])) {
            // json response
            case 'json':
                return res.json(Object.entries(stats).flatMap(([team, r]) => Object.entries(r).map(([pid, stat]) => ({
                    team,
                    pid,
                    stat,
                }))));
            // csv response
            case 'csv': {
                const { year } = req.params,
                    head = `year,team,pid,${bstatIndexer.keys.join(',')}\n`,
                    csv = Object.entries(stats).map(([team, roster]) => Object.entries(roster).map(([pid, stat]) => `${year},${team},${pid},${stat.join(',')}\n`).join('')).join('');
                return res.set('Content-Type', 'text/csv').send(head + csv);
            }
            // error 406
            default:
                return next(406);
        }
    }
}

const pstatIndexer = new StatIndexer('W', 'L', 'SV', 'IP', 'BF', 'R', 'ER', 'S', 'D', 'T', 'HR', 'BB', 'HBP', 'IBB', 'K', 'BK', 'WP', 'PO', 'GDP');

async function pitching(req, res, next) {
    const sim = new RosterStats();
    let stats = await playerMap(req.params, ({ p }) => (p ? pstatIndexer.emptySet() : null));
    if (req.params.team) {
        const { team } = req.params;
        stats = stats[team];
        // register stat callback
        sim.addListener('pstat', ({ tid, pid }, keys) => {
            if (tid === team) pstatIndexer.apply(stats[pid], ...keys);
        });
        // sim games
        await sim.simGames(req.params);
        // determine reponse type
        switch (req.accepts(['json', 'csv'])) {
            // json response
            case 'json':
                return res.json(Object.entries(stats).map(([pid, stat]) => ({ team, pid, stat })));
            // csv response
            case 'csv': {
                const { year } = req.params,
                    head = `year,team,pid,${pstatIndexer.keys.join(',')}\n`,
                    csv = Object.entries(stats).map(([pid, stat]) => `${year},${team},${pid},${stat.join(',')}\n`).join('');
                return res.set('Content-Type', 'text/csv').send(head + csv);
            }
            // error 406
            default:
                return next(406);
        }
    } else {
        // register stat callback
        sim.addListener('pstat', ({ tid, pid }, keys) => {
            pstatIndexer.apply(stats[tid][pid], ...keys);
        });
        // sim games
        await sim.simGames(req.params);
        // determine response type
        switch (req.accepts(['json', 'csv'])) {
            // json response
            case 'json':
                return res.json(Object.entries(stats).flatMap(([team, r]) => Object.entries(r).map(([pid, stat]) => ({
                    team,
                    pid,
                    stat,
                }))));
            // csv response
            case 'csv': {
                const { year } = req.params,
                    head = `year,team,pid,${pstatIndexer.keys.join(',')}\n`,
                    csv = Object.entries(stats).map(([team, roster]) => Object.entries(roster).map(([pid, stat]) => `${year},${team},${pid},${stat.join(',')}\n`).join('')).join('');
                return res.set('Content-Type', 'text/csv').send(head + csv);
            }
            // error 406
            default:
                return next(406);
        }
    }
}

const dstatIndexer = new StatIndexer('P', 'A', 'E', 'PB');

async function defense(req, res, next) {
    const sim = new RosterStats();
    let stats = await playerMap(req.params, () => dstatIndexer.emptySet());
    if (req.params.team) {
        const { team } = req.params;
        stats = stats[team];
        // register stat callback
        sim.addListener('dstat', ({ tid, pid }, keys) => {
            if (tid === team) dstatIndexer.apply(stats[pid], ...keys);
        });
        // sim games
        await sim.simGames(req.params);
        // determine response type
        switch (req.accepts(['json', 'csv'])) {
            // json response
            case 'json':
                return res.json(Object.entries(stats).map(([pid, stat]) => ({ team, pid, stat })));
            // csv response
            case 'csv': {
                const { year } = req.params,
                    head = `year,team,pid,${dstatIndexer.keys.join(',')}\n`,
                    csv = Object.entries(stats).map(([pid, stat]) => `${year},${team},${pid},${stat.join(',')}\n`).join('');
                return res.set('Content-Type', 'text/csv').send(head + csv);
            }
            // error 406
            default:
                return next(406);
        }
    } else {
        // register stat callback
        sim.addListener('dstat', ({ tid, pid }, keys) => {
            dstatIndexer.apply(stats[tid][pid], ...keys);
        });
        // sim games
        await sim.simGames(req.params);
        // determine response type
        switch (req.accepts(['json', 'csv'])) {
            // json response
            case 'json':
                return res.json(Object.entries(stats).flatMap(([team, r]) => Object.entries(r).map(([pid, stat]) => ({
                    team,
                    pid,
                    stat,
                }))));
            // csv response
            case 'csv': {
                const { year } = req.params,
                    head = `year,team,pid,${dstatIndexer.keys.join(',')}\n`,
                    csv = Object.entries(stats).map(([team, roster]) => Object.entries(roster).map(([pid, stat]) => `${year},${team},${pid},${stat.join(',')}\n`).join('')).join('');
                return res.set('Content-Type', 'text/csv').send(head + csv);
            }
            // error 406
            default:
                return next(406);
        }
    }
}

module.exports = {
    data,
    batting,
    pitching,
    defense,
};