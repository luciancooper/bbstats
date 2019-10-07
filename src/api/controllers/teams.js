const teamData = require('../../db/teams');

async function getTeams(req, res, next) {
    try {
        const teams = await teamData(req.params).array();
        return res.status(200).json(teams);
    } catch (e) {
        return next(e);
    }
}

module.exports = getTeams;