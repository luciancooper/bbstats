const { db } = require('./service');

function gameData({ year, team }) {
    let match;
    if (team) {
        match = { $and: [{ year }, { $or: [{ home: team }, { away: team }] }] };
    } else {
        match = { year };
    }
    return db().collection('games').aggregate([
        { $match: match },
        { $sort: { month: 1, day: 1, gn: 1 } },
    ]);
}

module.exports = gameData;