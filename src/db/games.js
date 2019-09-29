const { db } = require('./service'),
    DataCursor = require('./cursor');

function gameData({ year, team }) {
    let match;
    if (team) {
        match = { $and: [{ year }, { $or: [{ home: team }, { away: team }] }] };
    } else {
        match = { year };
    }
    return new DataCursor(db().collection('games').aggregate([
        { $match: match },
        { $sort: { month: 1, day: 1, gn: 1 } },
    ]));
}

module.exports = gameData;