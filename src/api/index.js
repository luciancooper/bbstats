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

const {
    season: teamSeason,
    games: teamGames,
    data: teamData,
} = require('./controllers/teams');

// add team data route
router.get('/teams/:year', validate, teamData);

const {
    season: rosterSeason,
    games: rosterGames,
    data: rosterData,
} = require('./controllers/rosters');

// add roster data route
router.get('/rosters/:year/:team?', validate, rosterData);

const {
    scores: gameScores,
    info: gameInfo,
} = require('./controllers/games');

// add game scores route
router.get('/scores/:year/:team?', validate, gameScores);

// add game info route
router.get('/gameinfo/:year/:team?', validate, gameInfo);

const {
    season: handedSeason,
} = require('./controllers/handed');

// add batting stats routes
router.get('/batting/team/games/:year/:team?', validate, teamGames('bstat', bstat));
router.get('/batting/team/:year', validate, teamSeason('bstat', bstat));
router.get('/batting/player/games/:year/:team?', validate, rosterGames('bstat', bstat));
router.get('/batting/player/:year/:team?', validate, rosterSeason('bstat', bstat, false));
router.get('/batting/handed/:year/:team?', validate, handedSeason('bstat', bstat.slice(0, -3), false));

// add pitching stats routes
router.get('/pitching/team/games/:year/:team?', validate, teamGames('pstat', pstat));
router.get('/pitching/team/:year', validate, teamSeason('pstat', pstat));
router.get('/pitching/player/games/:year/:team?', validate, rosterGames('pstat', pstat));
router.get('/pitching/player/:year/:team?', validate, rosterSeason('pstat', pstat, true));
router.get('/pitching/handed/:year/:team?', validate, handedSeason('pstat', pstat.slice(5), true));

// add defensive stats routes
router.get('/defense/team/games/:year/:team?', validate, teamGames('dstat', dstat));
router.get('/defense/team/:year', validate, teamSeason('dstat', dstat));
router.get('/defense/player/games/:year/:team?', validate, rosterGames('dstat', dstat.slice(2)));
router.get('/defense/player/:year/:team?', validate, rosterSeason('dstat', dstat.slice(2), false));

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