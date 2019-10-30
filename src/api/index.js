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

const bstat = ['O', 'E', 'S', 'D', 'T', 'HR', 'BB', 'IBB', 'HBP', 'K', 'I', 'SH', 'SF', 'GDP', 'R', 'RBI', 'SB', 'CS', 'PO'],
    pstat = ['W', 'L', 'SV', 'R', 'ER', 'IP', 'BF', 'S', 'D', 'T', 'HR', 'BB', 'HBP', 'IBB', 'K', 'BK', 'WP', 'PO', 'GDP'],
    dstat = ['UR', 'TUR', 'P', 'A', 'E', 'PB'];

// add team routes
const {
    season: teamSeason,
    data: teamData,
} = require('./controllers/teams');

router.get('/teams/batting/:year', validate, teamSeason('bstat', bstat));
router.get('/teams/pitching/:year', validate, teamSeason('pstat', pstat));
router.get('/teams/defense/:year', validate, teamSeason('dstat', dstat));
router.get('/teams/:year', validate, teamData);

// add game routes
const {
    scores: gameScores,
    stats: gameStats,
} = require('./controllers/games');

router.get('/games/scores/:year/:team?', validate, gameScores);
router.get('/games/batting/:year/:team?', validate, gameStats('bstat', bstat));
router.get('/games/pitching/:year/:team?', validate, gameStats('pstat', pstat));
router.get('/games/defense/:year/:team?', validate, gameStats('dstat', dstat));

// add roster routes
const {
    season: rosterSeason,
    data: rosterData,
} = require('./controllers/rosters');

router.get('/rosters/batting/:year/:team?', validate, rosterSeason('bstat', bstat, false));
router.get('/rosters/pitching/:year/:team?', validate, rosterSeason('pstat', pstat, true));
router.get('/rosters/defense/:year/:team?', validate, rosterSeason('dstat', dstat.slice(2), false));
router.get('/rosters/:year/:team?', validate, rosterData);

// add handed routes
const {
    season: handedSeason,
} = require('./controllers/handed');

router.get('/handed/batting/:year/:team?', validate, handedSeason('bstat', bstat.slice(0, -3), false));
router.get('/handed/pitching/:year/:team?', validate, handedSeason('pstat', pstat.slice(5), true));

// add retrosheet routes
const {
    unzip,
    clear,
} = require('../rs');

router.route('/retrosheet/:year').all(validate).put(unzip).delete(clear);

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