const request = require('request'),
    unzipper = require('unzipper'),
    { Transform, Writable } = require('stream'),
    games = require('./games'),
    rosters = require('./rosters'),
    teams = require('./teams');

async function unzip(req, res, next) {
    const { year } = req.params,
        clearGames = await games.clear(year),
        clearPlayers = await rosters.clear(year),
        clearTeams = await teams.clear(year),
        playerOpps = { modified: 0, inserted: 0, files: [] },
        teamOpps = { modified: 0, inserted: 0, files: [] },
        gameOpps = { inserted: 0, files: [] },
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
    const { year } = req.params;
    res.json({
        year,
        summary: {
            teams: await teams.count(year),
            players: await rosters.count(year),
            games: await games.count(year),
        },
    });
}

module.exports = {
    unzip,
    clear,
    summary,
};