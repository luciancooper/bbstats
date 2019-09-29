const { db } = require('./service'),
    DataCursor = require('./cursor');

function teamData({ year }) {
    return new DataCursor(db().collection('teams').aggregate([
        { $match: { years: year } },
        { $replaceWith: { team: '$_id', league: '$lg' } },
        { $sort: { team: 1 } },
    ]));
}

module.exports = teamData;