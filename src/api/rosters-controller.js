const rosterData = require('../db/rosters');

async function getRosters(req, res, next) {
    try {
        const rosters = await rosterData(req.params).array();
        return res.status(200).json(rosters.length === 1 ? rosters[0] : rosters);
    } catch (e) {
        return next(e);
    }
}

module.exports = getRosters;