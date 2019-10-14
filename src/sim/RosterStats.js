const RosterSim = require('./RosterSim');

class RosterStats extends RosterSim {
    stat(type, t, pid, ...keys) {
        if (!keys.length) return;
        this.emit(type, { gid: this.gid, tid: this.teams[t], pid }, keys);
    }

    event(line) {
        let ekey,
            e = line[1].split('+');
        this.defevent(line[8], line[9], line[10]);
        if (this.ecode <= 10) {
            if (this.ecode <= 1) {
                // O,E / SF,SH
                ekey = e.slice(-1);
            } else if (this.ecode <= 4) {
                // K,BB,IBB
                this.stat('pstat', this.dt, this.rppid, e[0]);
                ekey = [e[0]];
                e = e.slice(1);
                if (e.length) {
                    if (['WP', 'PB', 'OA', 'DI'].includes(e[0])) {
                        // Charge current pitcher with a wild pitch
                        if (e[0] === 'WP') this.stat('pstat', this.dt, this.ppid, 'WP');
                        // Charge current catcher with a passed ball
                        if (e[0] === 'PB') this.stat('dstat', this.dt, this.cpid, 'PB');
                        e = e.slice(1);
                    }
                    this.runevent(...e);
                }
            } else {
                // HBP,I,S,D,T,HR
                ekey = [e[0]];
                if (e[0] !== 'I') this.stat('pstat', this.dt, this.rppid, e[0]);
            }
            if (this.emod.includes('GDP')) ekey = [...ekey, 'GDP'];
            if (!this.nopitcher || this.bfp !== 0) {
                // Credit responsible batter with batting stats
                this.stat('bstat', this.t, this.rbpid, ...ekey);
            }
            // Credit responsible pitcher with a batter faced
            this.stat('pstat', this.dt, this.rppid, 'BF');
        } else if (this.ecode <= 14) {
            if (e.length > 1) this.runevent(...e.slice(1));
            // Charge current pitcher with a wild pitch
            if (this.ecode === 11) this.stat('pstat', this.dt, this.ppid, e[0]);
            // Charge current catcher with a passed ball
            if (this.ecode === 12) this.stat('dstat', this.dt, this.cpid, 'PB');
        } else if (this.ecode === 15) {
            this.runevent(...e);
        } else if (this.ecode === 16) {
            // Charge current pitcher with a balk
            this.stat('pstat', this.dt, this.ppid, 'BK');
        }
        super.event(line);
    }

    final(data) {
        const winner = this.score[1] > this.score[0] ? 1 : 0;
        if (data.pitching.wp) {
            // Credit pitcher with win
            this.stat('pstat', winner, data.pitching.wp, 'W');
        }
        if (data.pitching.lp) {
            // Charge pitcher with loss
            this.stat('pstat', winner ^ 1, data.pitching.lp, 'L');
        }
        if (data.pitching.save) {
            // Credit pitcher with save
            this.stat('pstat', winner, data.pitching.save, 'SV');
        }
    }

    defevent(a, p, e) {
        const t = this.dt;
        // Credit fielders with assists
        [...a].filter((c) => c !== 'X').forEach((i) => {
            this.stat('dstat', t, this.fpos[t][Number(i) - 1], 'A');
        }, this);
        // Credit fielders with putouts
        [...p].filter((c) => c !== 'X').forEach((i) => {
            this.stat('dstat', t, this.fpos[t][Number(i) - 1], 'P');
        }, this);
        // Charge fielders with errors
        [...e].filter((c) => c !== 'X').forEach((i) => {
            this.stat('dstat', t, this.fpos[t][Number(i) - 1], 'E');
        }, this);
    }

    runevent(...events) {
        if (!events.length) return;
        // Credit baserunners with run events
        events.forEach((e) => {
            const pid = this.bases[Number(e.slice(-1)) - 1][0];
            this.stat('bstat', this.t, pid, e.slice(-3, -1));
        }, this);
        const pickoff = events.map((e) => e.slice(-3, -1)).filter((e) => e === 'PO');
        if (pickoff.length) {
            // Credit current pitcher with pickoff
            this.stat('pstat', this.dt, this.ppid, ...pickoff);
        }
    }

    scorerun(flag, rpid, ppid) {
        super.scorerun(flag);
        // Credit baserunner with a run
        this.stat('bstat', this.t, rpid, 'R');
        // Charge current pitcher with a run
        this.stat('pstat', this.dt, this.rppid, 'R');
        const [ur, rbi, norbi] = [1, 3, 4].map((i) => Number(flag.charAt(i)));
        if (this.checkRbi(rbi, norbi)) {
            // Credit responsible batter with an RBI
            this.stat('bstat', this.t, this.rbpid, 'RBI');
        }
        if (ur === 0) {
            // Charge pitcher responsible for runner with an earned run
            this.stat('pstat', this.dt, ppid, 'ER');
        }
    }

    outinc() {
        super.outinc();
        // Credit current responsible pitcher with an inning pitched
        this.stat('pstat', this.dt, this.rppid, 'IP');
    }
}

module.exports = RosterStats;