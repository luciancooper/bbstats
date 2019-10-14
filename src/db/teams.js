const { db } = require('./service'),
    DataCursor = require('./cursor');

function teamData({ year }) {
    return new DataCursor(db().collection('teams').aggregate([
        { $match: { years: year } },
        { $replaceWith: { team: '$_id', league: '$lg' } },
        { $sort: { team: 1 } },
    ]));
}

async function teamMap(params, fn) {
    return teamData(params).reduce((acc, { team }) => {
        acc[team] = fn({ team });
        return acc;
    }, {});
}

module.exports = {
    teamData,
    teamMap,
};