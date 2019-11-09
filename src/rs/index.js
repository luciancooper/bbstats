const request = require('request'),
    unzipper = require('unzipper'),
    { Transform, Writable } = require('stream'),
    { db } = require('../db/service'),
    games = require('./games'),
    rosters = require('./rosters'),
    teams = require('./teams');

async function unzip(req, res, next) {
    // remove timeout
    req.setTimeout(0);
    const { year } = req.params,
        clearGames = await games.clear(year),
        clearPlayers = await rosters.clear(year),
        clearTeams = await teams.clear(year),
        playerOpps = { modified: 0, inserted: 0, files: [] },
        teamOpps = { modified: 0, inserted: 0, files: [] },
        gameOpps = { inserted: 0, files: [] },
        teamGames = {},
        processor = rosters.processor();
    request(`https://www.retrosheet.org/events/${year}eve.zip`)
        .pipe(unzipper.Parse())
        .pipe(Transform({
            objectMode: true,
            transform(entry, enc, cb) {
                const { path } = entry;
                console.log(`[${year}] unzipping ${path}`);
                if (/\.E[VD][NA]$/.test(path)) {
                    // event file
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
                                teamGames[home].push([gid, 'homeGameNumber']);
                                teamGames[away].push([gid, 'awayGameNumber']);
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
                    entry.pipe(teams.parser())
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
                Object.values(teamGames).forEach((s) => {
                    this.push(s.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)).map((g, i) => [...g, i + 1]));
                }, this);
                callback();
            },
        }))
        .pipe(Transform({
            objectMode: true,
            async transform(schedule, enc, done) {
                // update game number values in the 'games' collection
                for (let i = 0, n = schedule.length; i < n; i += 1) {
                    const [_id, key, index] = schedule[i];
                    await db().collection('games').updateOne({ _id }, { $set: { [key]: index } });
                }
                done();
            },
        }))
        .on('finish', () => {
            res.json({
                games: { ...clearGames, ...gameOpps },
                players: { cleared: clearPlayers, ...playerOpps },
                teams: { cleared: clearTeams, ...teamOpps },
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
    clear,
    summary,
};