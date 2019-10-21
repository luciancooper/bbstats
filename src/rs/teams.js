const { Transform, Writable } = require('stream'),
    { db } = require('../db/service');

function parser() {
    return new Transform({
        objectMode: true,
        transform(chunk, enc, done) {
            console.log(`team file parser (${enc})`);
            chunk.toString('utf-8').trim().split('\n').forEach((l) => {
                const [_id, lg, city, name] = l.slice(0, -1).split(',');
                this.push({ _id, lg, name: `${city} ${name}` });
            }, this);
            done();
        },
    });
}

function writer(year) {
    return new Writable({
        objectMode: true,
        async write(team, enc, done) {
            const collection = db().collection('teams'),
                { _id } = team,
                result = await collection.findOne({ _id });
            if (result) {
                await collection.updateOne({ _id }, { $push: { years: year } });
            } else {
                await collection.insertOne({ ...team, years: [year] });
            }
            done();
        },
    });
}

async function clear(year) {
    const collection = db().collection('teams');
    if (year == null) {
        const { deletedCount: deleted } = await collection.deleteMany({});
        return { modified: 0, deleted };
    }
    const { modifiedCount: modified } = await collection.updateMany({ years: year }, { $pull: { years: year } });
    if (modified) {
        const { deletedCount: deleted } = await collection.deleteMany({ years: { $size: 0 } });
        return { modified: modified - deleted, deleted };
    }
    return { modified, deleted: 0 };
}

module.exports = {
    parser,
    writer,
    clear,
};