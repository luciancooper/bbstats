const request = require('request'),
    unzipper = require('unzipper'),
    { Transform, Writable } = require('stream'),
    { ChunkedJSON } = require('../api/chunked'),
    games = require('./games'),
    rosters = require('./rosters'),
    teams = require('./teams');

async function unzip(req, res, next) {
    const { year } = req.params,
        chunked = new ChunkedJSON(res).open();
    await games.clear(year);
    await rosters.clear(year);
    await teams.clear(year);
    const processor = rosters.processor();
    request(`https://www.retrosheet.org/events/${year}eve.zip`)
        .pipe(unzipper.Parse())
        .pipe(Transform({
            objectMode: true,
            transform(entry, enc, cb) {
                const { path } = entry;
                console.log(`unzipping ${path}`);
                if (/\.E[VD][NA]$/.test(path)) {
                    // event file
                    entry.pipe(games.parser())
                        .pipe(processor.eve())
                        .pipe(games.processor())
                        .pipe(games.writer())
                        .pipe(Writable({
                            objectMode: true,
                            async write(results, e, done) {
                                chunked.write({ path, ...results });
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
                            async write(results, e, done) {
                                chunked.write({ path, ...results });
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
                            async write(results, e, done) {
                                chunked.write({ path, ...results });
                                done();
                            },
                        }))
                        .on('finish', cb);
                } else {
                    // other file
                    chunked.write({ path });
                    entry.autodrain();
                    cb();
                }
            },
        }))
        .on('finish', () => {
            console.log(`Retrosheet Unzip Complete (${year})`);
            chunked.close();
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

module.exports = {
    unzip,
    clear,
};