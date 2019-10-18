const request = require('request'),
    unzipper = require('unzipper'),
    { Transform } = require('stream'),
    { ChunkedJSON } = require('../api/chunked');

function unzip(req, res, next) {
    const { year } = req.params,
        chunked = new ChunkedJSON(res).open();
    request(`https://www.retrosheet.org/events/${year}eve.zip`)
        .pipe(unzipper.Parse())
        .pipe(Transform({
            objectMode: true,
            transform: (entry, enc, cb) => {
                const {
                    path,
                    type, // 'Directory' or 'File'
                    vars: { compressedSize, uncompressedSize },
                } = entry;
                console.log(`[${type}] ${path} - [${compressedSize} / ${uncompressedSize}]`);
                chunked.write({
                    path,
                    type,
                    compressedSize,
                    uncompressedSize,
                });
                entry.autodrain();
                cb();
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