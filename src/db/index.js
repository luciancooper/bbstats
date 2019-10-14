const teams = require('./teams'),
    games = require('./games'),
    rosters = require('./rosters');

module.exports = {
    ...teams,
    ...games,
    ...rosters,
};