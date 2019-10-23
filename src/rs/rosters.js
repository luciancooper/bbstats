const { Transform } = require('stream'),
    { db } = require('../db/service');

function parser() {
    let cached = '';
    return Transform({
        encoding: 'utf-8',
        transform(chunk, enc, done) {
            cached += chunk.toString('utf-8');
            done();
        },
        flush(callback) {
            if (cached) this.push(cached);
            cached = '';
            callback();
        },
    });
}

function parseLines(text) {
    return text.split('\n').map((l) => l.trim()).map((l) => {
        if (l === '') return null;
        if (l.startsWith('info')) return ['i', l.slice(5)];
        if (l.startsWith('play') && !l.endsWith(',NP')) return ['e', l.slice(5)];
        if (l.startsWith('start')) {
            const line = l.slice(6).split(',');
            return ['l', `${line[0]},${line.slice(2).join(',')}`];
        }
        if (l.startsWith('sub')) {
            const line = l.slice(4).split(',');
            return ['s', `${line[0]},${line.slice(2).join(',')}`];
        }
        return null;
    }).filter((l) => l);
}

const handIndex = { R: 0, L: 1, B: 2 };

function processor() {
    const pitchers = new Set();
    return {
        eve() {
            return Transform({
                encoding: 'utf-8',
                transform(chunk, enc, done) {
                    // extract pitchers from play-by-play context
                    const lines = parseLines(chunk.toString('utf-8')),
                        team = [null, null],
                        ppid = [null, null];
                    let x = 0,
                        [i, l] = lines[x],
                        k,
                        v;
                    while (i === 'i') {
                        [k, v] = l.split(',');
                        if (k === 'visteam') team[0] = v;
                        else if (k === 'hometeam') team[1] = v;
                        [i, l] = lines[x += 1];
                    }
                    while (i === 'l') {
                        if (Number(l.slice(13)) === 1) {
                            ppid[Number(l[9])] = l.slice(0, 8).toUpperCase();
                        }
                        [i, l] = lines[x += 1];
                    }
                    while (i === 'e' || i === 's') {
                        l = l.split(',');
                        if (i === 's') {
                            if (l[3] === '1') {
                                ppid[Number(l[1])] = l[0].toUpperCase();
                            }
                        } else {
                            const t = Number(l[1]) ^ 1;
                            pitchers.add(`${team[t]}-${ppid[t]}`);
                        }
                        try {
                            [i, l] = lines[x += 1];
                        } catch (e) {
                            break;
                        }
                    }
                    this.push(chunk);
                    done();
                },
            });
        },
        ros() {
            return Transform({
                objectMode: true,
                transform(chunk, enc, done) {
                    chunk.toString(enc).trim().split('\n').forEach((l) => {
                        const [pid, lastname, firstname, bh, th, team, pos] = l.trim().split(',');
                        this.push({
                            _id: pid.toUpperCase(),
                            firstname,
                            lastname,
                            teams: [{
                                team,
                                p: (pos === 'P' || pitchers.has(`${team}-${pid.toUpperCase()}`)) ? 1 : 0,
                                bh: handIndex[bh],
                                th: handIndex[th],
                            }],
                        });
                    }, this);
                    done();
                },
            });
        },
    };
}

function writer(year) {
    let [modified, inserted] = [0, 0];
    return Transform({
        objectMode: true,
        async transform(player, enc, done) {
            const collection = db().collection('players'),
                { _id, teams: [tinfo], ...name } = player,
                count = await collection.countDocuments({ _id });
            if (count) {
                const { modifiedCount } = await collection.updateOne({ _id }, { $push: { teams: { year, ...tinfo } } });
                modified += modifiedCount;
            } else {
                const { insertedCount } = await collection.insertOne({ _id, ...name, teams: [{ year, ...tinfo }] });
                inserted += insertedCount;
            }
            done();
        },
        flush(callback) {
            this.push({ modified, inserted });
            callback();
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
    processor,
    writer,
    clear,
};