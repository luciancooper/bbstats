const GameSim = require('./GameSim');

class RosterSim extends GameSim {
    constructor() {
        super();
        // Slots for baserunner & responsible pitcher ids
        this.bases = Array(3).fill(null);
        // Field position slots
        this.fpos = [Array(10).fill(null), Array(10).fill(null)];
        // Responsible id cache [pitcher, batter]
        this.rcache = [null, null];
    }

    get bpid() {
        return this.fpos[this.t][this.bfp];
    }

    get ppid() {
        return this.fpos[this.t ^ 1][0];
    }

    get rbpid() {
        return (this.ecode === 2 && this.rcache[1]) ? this.rcache[1] : this.bpid;
    }

    get rppid() {
        return ((this.ecode === 3 || this.ecode === 4) && this.rcache[0]) ? this.rcache[0] : this.ppid;
    }

    get cpid() {
        return this.fpos[this.dt][1];
    }

    init(data) {
        super.init(data);
        this.bases.fill(null);
        this.rcache.fill(null);
    }

    lineup(data) {
        this.lpos[0].fill(null);
        this.lpos[1].fill(null);
        this.fpos[0].fill(null);
        this.fpos[1].fill(null);
        const [alineup, hlineup] = data.lineup.map((l) => l.split(','));
        this.fpos[0][0] = alineup[0];
        this.fpos[1][0] = hlineup[0];
        for (let i = 0, ax, hx, ap, hp; i < 9; i += 1) {
            [ap, ax] = alineup[i + 1].split(':');
            [hp, hx] = hlineup[i + 1].split(':');
            this.lpos[0][i] = Number(ax);
            this.lpos[1][i] = Number(hx);
            this.fpos[0][Number(ax)] = ap;
            this.fpos[1][Number(hx)] = hp;
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
                    if (i === undefined) {
                        throw this.simError(`\npinchrun error [${runner}] not on base [${this.bases.map((x) => (x ? x[0] : '________')).join(',')}]`);
                    }
                    this.bases[i] = [pid, this.bases[i][1]];
                } else {
                    if (this.lp !== lpos) throw this.simError(`Pinchit Discrepancy lp[${this.lp}] lpos[${lpos}]`);
                    if (count && count.charAt(1) === '2') this.cacheBatter();
                }
                this.fpos[t][this.lpos[t][lpos]] = pid;
            } else {
                if (lpos >= 0) this.lpos[t][lpos] = fpos;
                this.fpos[t][fpos] = pid;
            }
        } else {
            if (fpos > 9) throw this.simError(`defensive pinch sub [${fpos}]`);
            if (lpos >= 0) this.lpos[t][lpos] = fpos;
            if (fpos === 0 && ['20', '21', '30', '31', '32'].includes(count)) this.cachePitcher();
            this.fpos[t][fpos] = pid;
        }
    }

    advance(badv, radv) {
        let advflg = 0;
        for (let i = 0, a; i < radv.length; i += 1) {
            a = radv[i];
            if (a.length === 0) continue;
            if (a.charAt(0) === 'X') {
                this.outinc();
                this.bflg ^= 1 << i;
                this.bases[i] = null;
            } else if (a.charAt(0) === 'H') {
                this.scorerun(a.slice(2), ...this.bases[i]);
                this.bflg ^= 1 << i;
                this.bases[i] = null;
            } else if (i !== Number(a.charAt(0)) - 1) {
                advflg |= 1 << i;
            }
        }
        this.bitindexes(advflg).reverse().forEach((i) => {
            this.bflg = (this.bflg ^ 1 << i) | (1 << Number(radv[i].charAt(0)) - 1);
            this.bases[Number(radv[i].charAt(0)) - 1] = this.bases[i];
            this.bases[i] = null;
        }, this);
        if (badv.length > 0) {
            if (badv.charAt(0) === 'X') {
                this.outinc();
            } else if (badv.charAt(0) === 'H') {
                this.scorerun(badv.slice(2), this.bpid, this.rppid);
            } else {
                this.bases[Number(badv.charAt(0)) - 1] = [this.bpid, this.rppid];
                this.bflg |= 1 << Number(badv.charAt(0)) - 1;
            }
            this.cycleLineup();
        }
    }

    cycleInning() {
        super.cycleInning();
        this.bases.fill(null);
    }

    cycleLineup() {
        super.cycleLineup();
        this.rcache.fill(null);
    }

    cachePitcher() {
        this.rcache[0] = this.ppid;
    }

    cacheBatter() {
        this.rcache[1] = this.bpid;
    }
}

module.exports = RosterSim;