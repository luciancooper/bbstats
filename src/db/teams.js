const { db } = require('./service');

function teamData({ year }) {
    return db().collection('teams').aggregate([
        { $match: { years: year } },
        { $replaceWith: { team: '$_id', league: '$lg' } },
        { $sort: { team: 1 } },
    ]);
}

module.exports = teamData;