const { Transform } = require('stream'),
    { db } = require('../../db/service'),
    { parseGame } = require('./lines'),
    { processGame } = require('./process');

function parser() {
    let cached = '';
    return Transform({
        encoding: 'utf-8',
        transform(chunk, enc, done) {
            let text = cached + chunk.toString('utf-8'),
                i = text.slice(1).search(/^id,/m) + 1;
            while (i > 0) {
                this.push(text.slice(0, i));
                text = text.slice(i);
                i = text.slice(1).search(/^id,/m) + 1;
            }
            cached = text;
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
            const lines = parseGame(chunk.toString(enc)).filter(([i]) => 'gilesobpd'.includes(i));
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

async function count(year) {
    return db().collection('games').count(year != null ? { year } : {});
}

module.exports = {
    parser,
    processor,
    writer,
    clear,
    count,
};