const request = require('request'),
    unzipper = require('unzipper'),
    { Transform } = require('stream'),
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
                const {
                    path,
                    type, // 'Directory' or 'File'
                    vars: { compressedSize, uncompressedSize },
                } = entry;
                console.log(`[${type}] ${path} - [${compressedSize} / ${uncompressedSize}]`);
                const file = {
                    path,
                    type,
                    compressedSize,
                    uncompressedSize,
                };
                if (/\.E[VD][NA]$/.test(path)) {
                    // event file
                    let gamecount = 0;
                    entry.pipe(games.parser())
                        .pipe(processor.eve())
                        .pipe(games.processor())
                        .pipe(Transform({
                            objectMode: true,
                            transform(game, e, done) {
                                gamecount += 1;
                                this.push(game);
                                done();
                            },
                        }))
                        .pipe(games.writer())
                        .on('finish', () => {
                            chunked.write({ ...file, gamecount });
                            console.log(`Finished Pipe for [${path}] (gamecount: ${gamecount})`);
                            cb();
                        });
                } else if (/\.ROS$/.test(path)) {
                    // rosters file
                    chunked.write(file);
                    entry.pipe(rosters.parser())
                        .pipe(processor.ros())
                        .pipe(rosters.writer(year))
                        .on('finish', cb);
                } else if (/^TEAM[0-9]{4}$/.test(path)) {
                    // teams file
                    chunked.write(file);
                    entry.pipe(teams.parser())
                        .pipe(teams.writer(year))
                        .on('finish', cb);
                } else {
                    // other file
                    chunked.write(file);
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

module.exports = {
    unzip,
};