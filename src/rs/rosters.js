const { Transform, Writable } = require('stream'),
    { db } = require('../db/service');

const handIndex = { R: 0, L: 1, B: 2 };

function parser() {
    let cached = '';
    return new Transform({
        objectMode: true,
        transform(chunk, enc, done) {
            cached += chunk.toString(enc);
            done();
        },
        flush(callback) {
            cached.trim().split('\n').forEach((l) => {
                const [pid, lastname, firstname, bh, th, team, pos] = l.trim().split(',');
                this.push({
                    _id: pid.toUpperCase(),
                    firstname,
                    lastname,
                    teams: [{
                        team,
                        p: pos === 'P' ? 1 : 0,
                        bh: handIndex[bh],
                        th: handIndex[th],
                    }],
                });
            }, this);
            cached = '';
            callback();
        },
    });
}

function writer(year) {
    return new Writable({
        objectMode: true,
        async write(player, enc, done) {
            const collection = db().collection('players'),
                { _id, teams: [teaminfo], ...name } = player,
                result = await collection.findOne({ _id });
            if (!result) {
                await collection.insertOne({ _id, ...name, teams: [{ year, ...teaminfo }] });
            } else {
                await collection.updateOne({ _id }, { $push: { teams: { year, ...teaminfo } } });
            }
            done();
        },
    });
}

async function clear(year) {
    const collection = db().collection('players');
    if (year == null) {
        const { deletedCount: deleted } = await collection.deleteMany({});
        return { modified: 0, deleted };
    }
    const { modifiedCount: modified } = await collection.updateMany({ 'teams.year': year }, { $pull: { teams: { year } } });
    if (modified) {
        const { deletedCount: deleted } = await collection.deleteMany({ teams: { $size: 0 } });
        return { modified: modified - deleted, deleted };
    }
    return { modified, deleted: 0 };
}

module.exports = {
    parser,
    writer,
    clear,
};