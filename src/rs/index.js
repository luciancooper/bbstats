const request = require('request'),
    unzipper = require('unzipper'),
    { Transform, Writable } = require('stream'),
    { db } = require('../db/service'),
    games = require('./games'),
    rosters = require('./rosters'),
    teams = require('./teams');

function unzip(year, reportObj, fileCallback) {
    const playerOpps = { modified: 0, inserted: 0, files: [] },
        teamOpps = { modified: 0, inserted: 0, files: [] },
        gameOpps = { inserted: 0, files: [] },
        teamGames = {},
        teamLeagues = {},
        processor = rosters.processor();
    if (reportObj) {
        Object.assign(reportObj, {
            games: gameOpps,
            players: playerOpps,
            teams: teamOpps,
        });
    }
    return request(`https://www.retrosheet.org/events/${year}eve.zip`)
        .pipe(unzipper.Parse())
        .pipe(Transform({
            objectMode: true,
            transform(entry, enc, cb) {
                const { path } = entry;
                if (/\.E[VD][NA]$/.test(path)) {
                    // event file
                    if (fileCallback) fileCallback({ type: 'event', path });
                    entry.pipe(games.parser())
                        .pipe(processor.eve())
                        .pipe(games.processor())
                        .pipe(Transform({
                            objectMode: true,
                            transform(game, e, done) {
                                const { _id: gid, home, away } = game;
                                // ensure teams exists in team games object
                                if (!teamGames[home]) teamGames[home] = [];
                                if (!teamGames[away]) teamGames[away] = [];
                                // add games to team games object
                                teamGames[home].push([gid, 'home']);
                                teamGames[away].push([gid, 'away']);
                                // continue pushing game through the pipeline
                                this.push(game);
                                done();
                            },
                        }))
                        .pipe(games.writer())
                        .pipe(Writable({
                            objectMode: true,
                            async write({ inserted }, e, done) {
                                gameOpps.inserted += inserted;
                                gameOpps.files.push({ path, inserted });
                                done();
                            },
                        }))
                        .on('finish', cb);
                } else if (/\.ROS$/.test(path)) {
                    // rosters file
                    if (fileCallback) fileCallback({ type: 'roster', path });
                    entry.pipe(rosters.parser())
                        .pipe(processor.ros())
                        .pipe(rosters.writer(year))
                        .pipe(Writable({
                            objectMode: true,
                            async write({ modified, inserted }, e, done) {
                                playerOpps.modified += modified;
                                playerOpps.inserted += inserted;
                                playerOpps.files.push({ path, modified, inserted });
                                done();
                            },
                        }))
                        .on('finish', cb);
                } else if (/^TEAM[0-9]{4}$/.test(path)) {
                    // teams file
                    if (fileCallback) fileCallback({ type: 'teams', path });
                    entry.pipe(teams.parser())
                        .pipe(Transform({
                            objectMode: true,
                            transform(team, e, done) {
                                const { _id, lg } = team;
                                // add team to leagues object
                                teamLeagues[_id] = lg;
                                // continue pushing team through the pipeline
                                this.push(team);
                                done();
                            },
                        }))
                        .pipe(teams.writer(year))
                        .pipe(Writable({
                            objectMode: true,
                            async write({ modified, inserted }, e, done) {
                                teamOpps.modified += modified;
                                teamOpps.inserted += inserted;
                                teamOpps.files.push({ path, modified, inserted });
                                done();
                            },
                        }))
                        .on('finish', cb);
                } else {
                    // other file
                    entry.autodrain();
                    cb();
                }
            },
            flush(callback) {
                // sort each tam schedule and push through the pipeline
                Object.entries(teamGames).forEach(([team, s]) => {
                    const lg = teamLeagues[team];
                    this.push(s.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map((g, i) => [...g, lg, i + 1]));
                }, this);
                callback();
            },
        }))
        .pipe(Transform({
            objectMode: true,
            async transform(schedule, enc, done) {
                // update game number values in the 'games' collection
                for (let i = 0, n = schedule.length; i < n; i += 1) {
                    const [_id, tkey, lg, index] = schedule[i];
                    await db().collection('games').updateOne({ _id }, {
                        $set: { [`${tkey}League`]: lg, [`${tkey}GameNumber`]: index },
                    });
                }
                done();
            },
        }));
}

async function populate(req, res, next) {
    // remove timeout
    req.setTimeout(0);
    const { year } = req.params,
        clearGames = await games.clear(year),
        clearPlayers = await rosters.clear(year),
        clearTeams = await teams.clear(year),
        report = {};
    unzip(year, report, ({ type, path }) => {
        console.log(`[${year}] ${type} ${path}`);
    }).on('finish', () => {
        res.json({
            games: { ...clearGames, ...report.games },
            players: { cleared: clearPlayers, ...report.players },
            teams: { cleared: clearTeams, ...report.teams },
        });
    });
}

async function clear(req, res, next) {
    const { year } = req.params,
        { deleted: gamesDeleted } = await games.clear(year),
        { modified: playersModified, deleted: playersDeleted } = await rosters.clear(year),
        { modified: teamsModified, deleted: teamsDeleted } = await teams.clear(year);
    res.json({
        games: { deleted: gamesDeleted },
        players: { modified: playersModified, deleted: playersDeleted },
        teams: { modified: teamsModified, deleted: teamsDeleted },
    });
}

async function summary(req, res, next) {
    const { year } = req.params,
        tcount = await teams.count(year),
        pcount = await rosters.count(year),
        gcount = await games.count(year);
    if (year) {
        res.json({
            year,
            summary: {
                teams: tcount,
                players: pcount,
                games: gcount,
            },
        });
    } else {
        res.json([...new Set([
            ...Object.keys(tcount),
            ...Object.keys(pcount),
            ...Object.keys(gcount),
        ])].map((y) => ({
            year: Number(y),
            summary: {
                teams: tcount[y] || 0,
                players: pcount[y] || 0,
                games: gcount[y] || 0,
            },
        })));
    }
}

module.exports = {
    unzip,
    populate,
    clear,
    summary,
};