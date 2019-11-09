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
        { $replaceRoot: { newRoot: { $mergeObjects: [{ gid: '$_id' }, '$$ROOT'] } } },
        { $project: { _id: 0 } },
    ]));
}

function gameInfo({ year, team }) {
    return new DataCursor(db().collection('games').aggregate([
        { $match: team ? { $and: [{ year }, { $or: [{ home: team }, { away: team }] }] } : { year } },
        {
            $replaceRoot: {
                newRoot: {
                    info: {
                        gid: '$_id',
                        site: '$site',
                    },
                    games: {
                        $let: {
                            vars: {
                                apitcher: { $substr: [{ $arrayElemAt: ['$lineup', 0] }, 0, 8] },
                                hpitcher: { $substr: [{ $arrayElemAt: ['$lineup', 1] }, 0, 8] },
                            },
                            in: [
                                {
                                    team: '$home',
                                    opponent: '$away',
                                    startingPitcher: '$$hpitcher',
                                    opponentStartingPitcher: '$$apitcher',
                                    home: true,
                                    gameNumber: '$homeGameNumber',
                                },
                                {
                                    team: '$away',
                                    opponent: '$home',
                                    startingPitcher: '$$apitcher',
                                    opponentStartingPitcher: '$$hpitcher',
                                    home: false,
                                    gameNumber: '$awayGameNumber',
                                },
                            ],
                        },
                    },
                },
            },
        },
        { $unwind: { path: '$games' } },
        ...(team ? [{ $match: { 'games.team': team } }] : []),
        { $replaceRoot: { newRoot: { $mergeObjects: ['$info', '$games'] } } },
        { $sort: { team: 1, gameNumber: 1 } },
    ]));
}

module.exports = {
    gameData,
    gameInfo,
};