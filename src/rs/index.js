const request = require('request'),
    unzipper = require('unzipper'),
    { Transform, Writable } = require('stream'),
    { ChunkedJSON } = require('../api/chunked'),
    games = require('./games');

function unzip(req, res, next) {
    const { year } = req.params,
        chunked = new ChunkedJSON(res).open();
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
                        .pipe(Writable({
                            write(game, e, done) {
                                gamecount += 1;
                                done();
                            },
                        }))
                        .on('finish', () => {
                            chunked.write({ ...file, gamecount });
                            console.log(`Finished Pipe for [${path}] (gamecount: ${gamecount})`);
                            cb();
                        });
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