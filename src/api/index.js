const router = require('express').Router(),
    { param, validationResult } = require('express-validator');

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

// validation middleware
function validate(req, res, next) {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        next();
        return;
    }
    // error 400
    res.status(400).json({
        code: 400,
        title: 'Invalid Request',
        'invalid-params': errors.array().reduce((acc, e) => {
            if (!acc[e.param]) {
                return { ...acc, [e.param]: { value: e.value, error: e.msg } };
            }
            const x = acc[e.param].error;
            acc[e.param].error = [...(Array.isArray(x) ? x : [x]), e.msg];
            return acc;
        }, {}),
    });
}

// add teams route
router.get('/teams/:year', validate, require('./controllers/teams'));

// add rosters route
router.get('/rosters/:year/:team?', validate, require('./controllers/rosters'));

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