const HandedSim = require('./HandedSim');

class HandedStats extends HandedSim {
    stat(type, t, pid, hand, ...keys) {
        if (!keys.length) return;
        this.emit(type, {
            gid: this.gid,
            tid: this.teams[t],
            pid,
            hand,
        }, keys);
    }

    event(line) {
        let ekey,
            e = line[1].split('+');
        if (this.ecode <= 10) {
            if (this.ecode <= 1) {
                // O,E / SF,SH
                ekey = e.slice(-1);
            } else if (this.ecode <= 4) {
                // K,BB,IBB
                this.stat('pstat', this.dt, this.rppid, this.rphand, e[0]);
                ekey = [e[0]];
                e = e.slice(1);
                if (e.length) {
                    if (['WP', 'PB', 'OA', 'DI'].includes(e[0])) {
                        // Charge current pitcher with a wild pitch
                        if (e[0] === 'WP') this.stat('pstat', this.dt, this.ppid, this.phand, 'WP');
                        e = e.slice(1);
                    }
                    this.runevent(...e);
                }
            } else {
                // HBP,I,S,D,T,HR
                ekey = [e[0]];
                if (e[0] !== 'I') this.stat('pstat', this.dt, this.rppid, this.rphand, e[0]);
            }
            if (this.emod.includes('GDP')) ekey = [...ekey, 'GDP'];
            if (!this.nopitcher || this.bfp !== 0) {
                // Credit responsible batter with batting stats
                this.stat('bstat', this.t, this.rbpid, this.rbhand, ...ekey);
            }
            // Credit responsible pitcher with a batter faced
            this.stat('pstat', this.dt, this.rppid, this.rphand, 'BF');
        } else if (this.ecode <= 14) {
            if (e.length > 1) this.runevent(...e.slice(1));
            // Charge current pitcher with a wild pitch
            if (this.ecode === 11) this.stat('pstat', this.dt, this.ppid, this.phand, e[0]);
        } else if (this.ecode === 15) {
            this.runevent(...e);
        } else if (this.ecode === 16) {
            // Charge current pitcher with a balk
            this.stat('pstat', this.dt, this.ppid, this.phand, 'BK');
        }
        super.event(line);
    }

    runevent(...events) {
        const pickoff = events.map((e) => e.slice(-3, -1)).filter((e) => e === 'PO');
        if (pickoff.length) {
            // Credit current pitcher with pickoff
            this.stat('pstat', this.dt, this.ppid, this.phand, ...pickoff);
        }
    }

    scorerun(flag, rpid, ppid) {
        super.scorerun(flag);
        const [rbi, norbi] = [3, 4].map((i) => Number(flag[i]));
        if (this.checkRbi(rbi, norbi)) {
            // Credit responsible batter with an RBI
            this.stat('bstat', this.t, this.rbpid, this.rbhand, 'RBI');
        }
    }

    outinc() {
        super.outinc();
        // Credit current responsible pitcher with an inning pitched
        this.stat('pstat', this.dt, this.rppid, this.rphand, 'IP');
    }
}

module.exports = HandedStats;