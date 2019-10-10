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

// add teams route
const teams = require('./controllers/teams');

router.get('/teams/batting/:year', validate, teams.batting);
router.get('/teams/pitching/:year', validate, teams.pitching);
router.get('/teams/defense/:year', validate, teams.defense);
router.get('/teams/:year', validate, teams.data);

// add rosters route
const rosters = require('./controllers/rosters');

router.get('/rosters/batting/:year/:team?', validate, rosters.batting);
router.get('/rosters/pitching/:year/:team?', validate, rosters.pitching);
router.get('/rosters/defense/:year/:team?', validate, rosters.defense);
router.get('/rosters/:year/:team?', validate, rosters.data);

// add games route
const games = require('./controllers/games');

router.get('/games/scores/:year/:team?', validate, games.scores);
router.get('/games/batting/:year/:team?', validate, games.batting);
router.get('/games/pitching/:year/:team?', validate, games.pitching);
router.get('/games/defense/:year/:team?', validate, games.defense);

// error 404
router.use((req, res, next) => {
    res.status(404).json({
        code: 404,
        title: 'Not Found',
        detail: `${req.method} ${req.originalUrl}`,
    });
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