const { db } = require('./service'),
    DataCursor = require('./cursor');

function rosterData({ year, team }) {
    let match,
        filter;
    if (team) {
        [match, filter] = [
            { teams: { $elemMatch: { year, team } } },
            { $and: [{ $eq: ['$$team.year', year] }, { $eq: ['$$team.team', team] }] },
        ];
    } else {
        [match, filter] = [{ 'teams.year': year }, { $eq: ['$$team.year', year] }];
    }
    return new DataCursor(db().collection('players').aggregate([
        // match nested teams
        { $match: match },
        // filter nested teams
        { $project: { teams: { $filter: { input: '$teams', as: 'team', cond: filter } } } },
        // unwind nested teams
        { $unwind: { path: '$teams' } },
        // restructure items
        {
            $replaceWith: {
                team: '$teams.team',
                pid: '$_id',
                p: '$teams.p',
                bh: '$teams.bh',
                th: '$teams.th',
            },
        },
        // sort by team then player
        { $sort: { team: 1, pid: 1 } },
        // group by team
        {
            $group: {
                _id: '$team',
                roster: {
                    $push: {
                        pid: '$pid',
                        p: '$p',
                        bh: '$bh',
                        th: '$th',
                    },
                },
            },
        },
        // rename _id to team
        { $replaceWith: { team: '$_id', roster: '$roster' } },
        // sort by team
        { $sort: { team: 1 } },
    ]));
}

async function rosterMap(params, callback) {
    return rosterData(params).reduce((accumulator, { team, roster }) => {
        accumulator[team] = roster.reduce((acc, { pid, ...info }) => {
            const x = callback({ pid, ...info });
            if (x) acc[pid] = x;
            return acc;
        }, {});
        return accumulator;
    }, {});
}

module.exports = {
    rosterData,
    rosterMap,
};