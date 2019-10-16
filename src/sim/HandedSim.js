const RosterSim = require('./RosterSim'),
    { rosterMap } = require('../db');

class HandedSim extends RosterSim {
    constructor() {
        super();
        this.lhand = [Array(9).fill(null), Array(9).fill(null)];
        this.fhand = [null, null];
        this.rhcache = [null, null];
        this.adjflag = [null, null];
        this.lookup = null;
    }

    get bhand() {
        if (this.adjflag[1] !== null) return this.adjflag[1];
        const hand = this.lhand[this.t][this.lp];
        if (hand < 2) return hand;
        return this.phand ^ 1;
    }

    get phand() {
        if (this.adjflag[0] !== null) return this.adjflag[0];
        if (this.fhand[this.dt] === 2) throw this.simError('Switch Pitcher Hand is Unknown');
        return this.fhand[this.dt];
    }

    get rbhand() {
        if (this.ecode === 2 && this.rhcache[1] !== null) return this.rhcache[1];
        if (this.adjflag[1] !== null) return this.adjflag[1];
        const hand = this.lhand[this.t][this.lp];
        if (hand < 2) return hand;
        return this.rphand ^ 1;
    }

    get rphand() {
        if ((this.ecode === 3 || this.ecode === 4) && this.rhcache[0] !== null) return this.rhcache[0];
        if (this.adjflag[0] !== null) return this.adjflag[0];
        if (this.fhand[this.dt] === 2) throw this.simError('Switch Pitcher Hand is Unknown');
        return this.fhand[this.dt];
    }

    bhlookup(team, pid) {
        try {
            return this.lookup[team][pid][0];
        } catch (e) {
            throw this.simError(`batter hand lookup failed [${team} ${pid}]`);
        }
    }

    phlookup(team, pid) {
        try {
            return this.lookup[team][pid][1];
        } catch (e) {
            throw this.simError(`pitcher hand lookup failed [${team} ${pid}]`);
        }
    }

    async simGames(ctx, callback) {
        const { year } = ctx;
        this.lookup = await rosterMap({ year }, ({ bh, th }) => [bh, th]);
        await super.simGames(ctx, callback);
        this.lookup = null;
    }

    init(data) {
        super.init(data);
        this.rhcache.fill(null);
        this.adjflag.fill(null);
    }

    lineup({ lineup, away, home }) {
        const [alineup, hlineup] = lineup.map((l) => l.split(','));
        // Wipe array stores
        this.lpos.forEach((a) => a.fill(null));
        this.fpos.forEach((a) => a.fill(null));
        this.lhand.forEach((a) => a.fill(null));
        this.fhand.fill(null);
        // Away starting pitcher
        this.fpos[0][0] = alineup[0];
        this.fhand[0] = this.phlookup(away, alineup[0]);
        // Home starting Pitcher
        this.fpos[1][0] = hlineup[0];
        this.fhand[1] = this.phlookup(home, hlineup[0]);
        // Team lineups & field positions
        for (let i = 0, ax, hx, ap, hp; i < 9; i += 1) {
            [ap, ax] = alineup[i + 1].split(':');
            [hp, hx] = hlineup[i + 1].split(':');
            this.lpos[0][i] = Number(ax);
            this.lpos[1][i] = Number(hx);
            this.fpos[0][Number(ax)] = ap;
            this.fpos[1][Number(hx)] = hp;
            this.lhand[0][i] = this.bhlookup(away, ap);
            this.lhand[1][i] = this.bhlookup(home, hp);
        }
    }

    sub(line) {
        const pid = line[1],
            t = Number(line[2]),
            lpos = Number(line[3]),
            fpos = Number(line[4]),
            offense = Number(line[5]),
            count = line[6];
        if (offense) {
            if (fpos > 9) {
                if (fpos === 11) {
                    // pinch run
                    const runner = this.fpos[t][this.lpos[t][lpos]],
                        i = this.bitindexes(this.bflg).find((x) => this.bases[x][0] === runner, this);
                    if (i === undefined) throw this.simError(`Pinch-run error [${runner}] not on base`);
                    this.bases[i] = [pid, this.bases[i][1]];
                } else {
                    if (this.lp !== lpos) throw this.simError(`Pinch-hit discrepancy lp[${this.lp}] lpos[${lpos}]`);
                    if (count && count[1] === '2') this.cacheBatter();
                }
                this.fpos[t][this.lpos[t][lpos]] = pid;
                this.lhand[t][lpos] = this.bhlookup(this.teams[t], pid);
                if (this.lpos[t][lpos] === 0) {
                    this.fhand[t] = this.phlookup(this.teams[t], pid);
                }
            } else {
                if (lpos >= 0) {
                    this.lpos[t][lpos] = fpos;
                    this.lhand[t][lpos] = this.bhlookup(this.teams[t], pid);
                }
                this.fpos[t][fpos] = pid;
                if (fpos === 0) this.fhand[t] = this.phlookup(this.teams[t], pid);
            }
        } else {
            if (fpos > 9) throw this.simError(`defensive pinch sub [${fpos}]`);
            if (fpos === 0 && ['20', '21', '30', '31', '32'].includes(count)) this.cachePitcher();
            if (lpos >= 0) {
                this.lpos[t][lpos] = fpos;
                this.lhand[t][lpos] = this.bhlookup(this.teams[t], pid);
            }
            this.fpos[t][fpos] = pid;
            if (fpos === 0) this.fhand[t] = this.phlookup(this.teams[t], pid);
        }
    }

    padj(line) {
        this.adjflag[0] = Number(line[1]);
    }

    badj(line) {
        this.adjflag[1] = Number(line[1]);
    }

    cycleInning() {
        super.cycleInning();
        this.adjflag.fill(null);
    }

    cycleLineup() {
        super.cycleLineup();
        this.adjflag.fill(null);
        this.rhcache.fill(null);
    }

    cachePitcher() {
        super.cachePitcher();
        this.rhcache[0] = this.phand;
    }

    cacheBatter() {
        super.cacheBatter();
        this.rhcache[1] = this.bhand;
    }
}

module.exports = HandedSim;