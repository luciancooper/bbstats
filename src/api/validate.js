const { validationResult } = require('express-validator');

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

module.exports = validate;