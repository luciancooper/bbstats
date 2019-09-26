const router = require('express').Router(),
    { param, validationResult } = require('express-validator');

// year param validator
router.param('year', param('year', 'Invalid year')
    .isInt({ min: 1950, max: 2020 })
    .toInt());

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
router.get('/teams/:year', validate, require('./teams-controller'));

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