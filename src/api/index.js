const router = require('express').Router(),
    { param } = require('express-validator'),
    validate = require('./validate');

// year param validator
router.param('year', param('year', 'Invalid year')
    .isInt({ min: 1950, max: 2020 })
    .toInt());

// team param validator
router.param('team', param('team', 'Invalid team id')
    .isAlphanumeric('en-US')
    .withMessage('Team id must be alpha numeric')
    .isUppercase()
    .withMessage('Team id must be upper case')
    .isLength({ min: 3, max: 3 })
    .withMessage('Team id must be 3 characters'));

// add team routes
const {
    batting: teamBatting,
    pitching: teamPitching,
    defense: teamDefense,
    data: teamData,
} = require('./controllers/teams');

router.get('/teams/batting/:year', validate, teamBatting);
router.get('/teams/pitching/:year', validate, teamPitching);
router.get('/teams/defense/:year', validate, teamDefense);
router.get('/teams/:year', validate, teamData);

// add roster routes
const {
    batting: rosterBatting,
    pitching: rosterPitching,
    defense: rosterDefense,
    data: rosterData,
} = require('./controllers/rosters');

router.get('/rosters/batting/:year/:team?', validate, rosterBatting);
router.get('/rosters/pitching/:year/:team?', validate, rosterPitching);
router.get('/rosters/defense/:year/:team?', validate, rosterDefense);
router.get('/rosters/:year/:team?', validate, rosterData);

// add handed routes
const {
    batting: handedBatting,
    pitching: handedPitching,
} = require('./controllers/handed');

router.get('/handed/batting/:year/:team?', validate, handedBatting);
router.get('/handed/pitching/:year/:team?', validate, handedPitching);

// add game routes
const {
    scores: gameScores,
    batting: gameBatting,
    pitching: gamePitching,
    defense: gameDefense,
} = require('./controllers/games');

router.get('/games/scores/:year/:team?', validate, gameScores);
router.get('/games/batting/:year/:team?', validate, gameBatting);
router.get('/games/pitching/:year/:team?', validate, gamePitching);
router.get('/games/defense/:year/:team?', validate, gameDefense);

const {
    unzip,
} = require('../rs');

router.get('/retrosheet/unzip/:year', validate, unzip);

// error 404
router.use((req, res, next) => {
    res.status(404).json({
        code: 404,
        title: 'Not Found',
        detail: `${req.method} ${req.originalUrl}`,
    });
});

// error 406
router.use((err, req, res, next) => {
    if (err === 406) {
        res.status(406).json({
            code: 406,
            title: 'Not Acceptable',
            detail: `'${req.get('Accept')}' is not an acceptable content type`,
        });
    } else next(err);
});

// error 500
router.use((err, req, res, next) => {
    res.status(500).json({
        code: 500,
        title: 'Internal Server Error',
        detail: err,
    });
});

module.exports = router;