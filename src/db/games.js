const { db } = require('./service'),
    DataCursor = require('./cursor');

function gameData({ year, team }) {
    return new DataCursor(db().collection('games').aggregate([
        { $match: team ? { $and: [{ year }, { $or: [{ home: team }, { away: team }] }] } : { year } },
        { $sort: { _id: 1 } },
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

function gameLineups({ year, team }) {
    return new DataCursor(db().collection('games').aggregate([
        { $match: team ? { $and: [{ year }, { $or: [{ home: team }, { away: team }] }] } : { year } },
        {
            $replaceRoot: {
                newRoot: {
                    gid: '$_id',
                    date: { $concat: [{ $toString: '$year' }, '-', '$date'] },
                    teams: {
                        $let: {
                            vars: {
                                alineup: { $arrayElemAt: ['$lineup', 0] },
                                hlineup: { $arrayElemAt: ['$lineup', 1] },
                            },
                            in: [
                                {
                                    team: '$away',
                                    home: false,
                                    gameNumber: '$awayGameNumber',
                                    pitcher: { $substr: ['$$alineup', 0, 8] },
                                    lineup: { $slice: [{ $split: ['$$alineup', ','] }, 1, 9] },
                                },
                                {
                                    team: '$home',
                                    home: true,
                                    gameNumber: '$homeGameNumber',
                                    pitcher: { $substr: ['$$hlineup', 0, 8] },
                                    lineup: { $slice: [{ $split: ['$$hlineup', ','] }, 1, 9] },
                                },
                            ],
                        },
                    },
                },
            },
        },
        { $unwind: { path: '$teams' } },
        ...(team ? [{ $match: { 'teams.team': team } }] : []),
        {
            $replaceRoot: {
                newRoot: {
                    gid: '$gid',
                    date: '$date',
                    team: '$teams.team',
                    home: '$teams.home',
                    gameNumber: '$teams.gameNumber',
                    pitcher: '$teams.pitcher',
                    lineup: {
                        $map: {
                            input: '$teams.lineup',
                            as: 'player',
                            in: {
                                pid: { $substr: ['$$player', 0, 8] },
                                pos: { $sum: [{ $toInt: { $substr: ['$$player', 9, 1] } }, 1] },
                            },
                        },
                    },
                },
            },
        },
        { $sort: { team: 1, gameNumber: 1 } },
    ]));
}

module.exports = {
    gameData,
    gameInfo,
    gameLineups,
};