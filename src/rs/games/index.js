const { Transform } = require('stream'),
    { db } = require('../../db/service'),
    { parseGame } = require('./lines'),
    { processGame } = require('./process');

function parser() {
    let cached = '';
    return Transform({
        encoding: 'utf-8',
        transform(chunk, enc, done) {
            let text = chunk.toString('utf-8'),
                i = text.search(/^id,/gm),
                cache = cached;
            while (i >= 0) {
                if (i || cache) this.push(cache + text.slice(0, i));
                cache = text.slice(i, i + 3);
                text = text.slice(i + 3);
                i = text.search(/^id,/gm);
            }
            cached = cache + text;
            done();
        },
        flush(callback) {
            if (cached) this.push(cached);
            cached = '';
            callback();
        },
    });
}

function processor() {
    return Transform({
        objectMode: true,
        transform(chunk, enc, done) {
            const lines = parseGame(chunk.toString(enc)).filter(([i]) => 'gilesdopbjur'.includes(i));
            this.push(processGame(lines));
            done();
        },
    });
}

function writer() {
    let inserted = 0;
    return Transform({
        objectMode: true,
        async transform(game, enc, done) {
            const { insertedCount } = await db().collection('games').insertOne(game);
            inserted += insertedCount;
            done();
        },
        flush(callback) {
            this.push({ inserted });
            callback();
        },
    });
}

async function clear(year) {
    const {
        deletedCount: deleted,
    } = await db().collection('games').deleteMany(year ? { year } : {});
    return { deleted };
}

module.exports = {
    parser,
    processor,
    writer,
    clear,
};