
const GameSim = require('./GameSim');

class GameStats extends GameSim {
    constructor(nopitcher = false) {
        super();
        this.nopitcher = nopitcher;
    }

    async simStats(type, games, cb, gamecb) {
        this.addListener(type, cb);
        if (gamecb) {
            await games.each((game) => {
                this.simGame(game);
                gamecb(game);
            }, this);
        } else {
            await games.each(this.simGame, this);
        }
        this.removeListener(type, cb);
    }

    stat(type, t, ...keys) {
        if (!keys.length) return;
        this.emit(type, { gid: this.gid, t, tid: this.teams[t] }, keys);
    }

    event(line) {
        let ekey,
            e = line[1].split('+');
        this.defevent(line[8], line[9], line[10]);
        if (this.ecode <= 10) {
            if (this.ecode <= 1) {
                // O,E / SF,SH
                ekey = e.slice(-1);
                // if (ekey[0] === 'SF' || ekey[0] === 'SH') this.stat('pstat', this.t, ...ekey);
            } else if (this.ecode <= 4) {
                // K,BB,IBB
                this.stat('pstat', this.dt, e[0]);
                ekey = [e[0]];
                e = e.slice(1);
                if (e.length) {
                    if (['WP', 'PB', 'OA', 'DI'].includes(e[0])) {
                        if (e[0] === 'WP') this.stat('pstat', this.dt, 'WP');
                        if (e[0] === 'PB') this.stat('dstat', this.dt, 'PB');
                        e = e.slice(1);
                    }
                    this.runevent(...e);
                }
            } else {
                // HBP,I,S,D,T,HR
                ekey = [e[0]];
                if (e[0] !== 'I') this.stat('pstat', this.dt, e[0]);
            }
            if (this.emod.includes('GDP')) ekey = [...ekey, 'GDP'];
            if (!this.nopitcher || this.bfp !== 0) {
                this.stat('bstat', this.t, ...ekey);
            }
            // Batter Faced
            this.stat('pstat', this.dt, 'BF');
        } else if (this.ecode <= 14) {
            if (e.length > 1) this.runevent(...e.slice(1));
            // WP
            if (this.ecode === 11) this.stat('pstat', this.dt, e[0]);
            // PB
            if (this.ecode === 12) this.stat('dstat', this.dt, 'PB');
        } else if (this.ecode === 15) {
            this.runevent(...e);
        } else if (this.ecode === 16) {
            // BK
            this.stat('pstat', this.dt, 'BK');
        }
        super.event(line);
    }

    final(data) {
        const winner = this.score[1] > this.score[0] ? 1 : 0;
        if (data.pitching.wp) {
            this.stat('pstat', winner, 'W');
        }
        if (data.pitching.lp) {
            this.stat('pstat', winner ^ 1, 'L');
        }
        if (data.pitching.save) {
            this.stat('pstat', winner, 'SV');
        }
    }

    defevent(a, p, e) {
        if (a) {
            this.stat('dstat', this.dt, ...Array(p.length).fill('A'));
        }
        if (p) {
            this.stat('dstat', this.dt, ...Array(p.length).fill('P'));
        }
        if (e) {
            this.stat('dstat', this.dt, ...Array(e.length).fill('E'));
        }
    }

    runevent(...events) {
        if (!events.length) return;
        const e = events.map((s) => s.slice(-3, -1)),
            pickoff = e.filter((s) => s === 'PO');
        this.stat('bstat', this.t, ...e);
        if (pickoff.length) {
            this.stat('pstat', this.dt, ...pickoff);
        }
    }

    scorerun(flag, ...args) {
        super.scorerun(flag, ...args);
        this.stat('bstat', this.t, 'R');
        this.stat('pstat', this.dt, 'R');
        const [ur, tur, rbi, norbi] = [1, 2, 3, 4].map((i) => Number(flag.charAt(i)));
        if (this.checkRbi(rbi, norbi)) {
            this.stat('bstat', this.t, 'RBI');
        }
        if (ur === 1) {
            this.stat('dstat', this.dt, 'UR');
        } else {
            this.stat('pstat', this.dt, 'ER');
        }
        if (tur === 1) {
            this.stat('dstat', this.dt, 'TUR');
        }
    }

    outinc() {
        super.outinc();
        this.stat('pstat', this.dt, 'IP');
    }
}

module.exports = GameStats;