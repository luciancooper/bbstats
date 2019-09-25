const teamData = require('../db/teams');

async function getTeams(req, res, next) {
    const { year } = req.params;
    try {
        const teams = await teamData(Number(year)).toArray();
        return res.status(200).json(teams);
    } catch (e) {
        return next(e);
    }
}

module.exports = getTeams;