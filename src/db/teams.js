const { db } = require('./service'),
    DataCursor = require('./cursor');

function teamData({ year }) {
    return new DataCursor(db().collection('teams').aggregate([
        { $match: { years: year } },
        { $replaceRoot: { newRoot: { team: '$_id', league: '$lg' } } },
        { $sort: { team: 1 } },
    ]));
}

async function teamList({ year }) {
    try {
        const { teams } = await db().collection('teams').aggregate([
            { $match: { years: year } },
            { $sort: { _id: 1 } },
            { $group: { _id: null, teams: { $push: '$_id' } } },
            { $project: { _id: 0 } },
        ]).next();
        return teams;
    } catch (error) {
        return [];
    }
}

async function teamInfo({ team }) {
    const { lg, name } = await db().collection('teams').findOne({ _id: team });
    return { team, lg, name };
}

async function teamMap(params, fn) {
    return teamData(params).reduce((acc, { team }) => {
        acc[team] = fn({ team });
        return acc;
    }, {});
}

module.exports = {
    teamData,
    teamList,
    teamInfo,
    teamMap,
};