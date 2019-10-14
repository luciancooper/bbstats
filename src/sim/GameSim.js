const { EventEmitter } = require('events'),
    { gameData } = require('../db');

class GameSim extends EventEmitter {
    constructor() {
        super();
        // Year
        this.year = null;
        // Game ID - YYYYMMDDHHHAAAG
        this.gid = null;
        // Current Event Number
        this.eid = null;
        // Current Event Code
        this.ecode = null;
        this.emod = null;
        // Teams
        this.teams = Array(2).fill(null);
        // Site ID
        this.site = null;
        // If game is using the Designated Hitter rule
        this.useDH = null;
        // Binary Flag - number indicating which bases are currently occupied
        this.bflg = 0;
        // Context (inning,top/bottom,outs)
        this.i = 0;
        this.t = 0;
        this.o = 0;
        // Total Outs
        this.totouts = [0, 0];
        // Box Score
        this.score = [0, 0];
        // Left on Base
        this.lob = [0, 0];
        // Batting Order
        this.lpos = [Array(9).fill(null), Array(9).fill(null)];
        // At bat index
        this.abinx = [0, 0];
        // Batting out of turn - flag if team is the process of batting out of order (very rare)
        this.bootflg = [0, 0];
        this.bootinx = [[], []];
    }

    get date() {
        return `${this.gid.slice(0, 4)}-${this.gid.slice(4, 6)}-${this.gid.slice(6, 8)}`;
    }

    get home() {
        return this.teams[1];
    }

    get away() {
        return this.teams[0];
    }

    get baseoutstate() {
        return (this.o << 3) | this.bflg;
    }

    get inning() {
        return Math.floor(this.i / 2) + 1;
    }

    get dt() {
        return this.t ^ 1;
    }

    get lp() {
        if (this.bootflg[this.t]) {
            return this.bootinx[this.t][this.bootinx[this.t].length - 1];
        }
        return this.abinx[this.t];
    }

    get bfp() {
        return this.lpos[this.t][this.lp];
    }

    simError(message) {
        return new Error(`[${this.gid} - ${this.eid}] ${message}`);
    }

    async simGames(ctx, callback) {
        if (callback) {
            await gameData(ctx).each((game) => {
                this.simGame(game);
                callback(game);
            }, this);
        } else {
            await gameData(ctx).each(this.simGame, this);
        }
    }

    async simScores(ctx, callback) {
        await gameData(ctx).each((game) => {
            this.simGame(game);
            callback({ gid: this.gid }, { score: this.score.slice() });
        }, this);
    }

    simGame(data) {
        this.init(data);
        this.lineup(data);
        for (let i = 0, n = data.events.length, line; i < n; i += 1) {
            line = data.events[i].slice(2).split(',');
            try {
                switch (data.events[i].charAt(0)) {
                    case 'E':
                        this.play(line);
                        break;
                    case 'S':
                        this.sub(line);
                        break;
                    case 'O':
                        this.boot(line);
                        break;
                    case 'B':
                        this.badj(line);
                        break;
                    case 'P':
                        this.padj(line);
                        break;
                    default:
                        break;
                }
            } catch (e) {
                throw this.simError(`Error Occured while Processing ${data.events[i]}: ${e}`);
            }
        }
        this.final(data);
    }

    init(data) {
        this.gid = data.gid;
        this.year = data.year;
        this.eid = 0;
        this.teams = [data.away, data.home];
        this.site = data.site;
        this.useDH = data.dh;
        this.t = data.htbf;
        this.ecode = null;
        this.bflg = 0;
        this.i = 0;
        this.t = 0;
        this.o = 0;
        this.totouts = [0, 0];
        this.score = [0, 0];
        this.lob = [0, 0];
        this.abinx = [0, 0];
        this.bootflg = [0, 0];
        this.bootinx = [[], []];
    }

    lineup(data) {
        this.lpos[0].fill(null);
        this.lpos[1].fill(null);
        const lineup = data.lineup.map((l) => l.split(','));
        for (let i = 0; i < 9; i += 1) {
            this.lpos[0][i] = Number(lineup[0][i + 1].split(':')[1]);
            this.lpos[1][i] = Number(lineup[1][i + 1].split(':')[1]);
        }
    }

    play(line) {
        this.eid += 1;
        this.ecode = Number(line[2]);
        this.emod = line[3].split('/');
        // boot cycle
        if (this.bootflg[this.t] & 2) {
            const i = this.abinx[this.t],
                j = Math.max(...this.bootinx[this.t]);
            this.abinx[this.t] = (this.abinx[this.t] + (j - i + 1)) % 9;
            this.bootflg[this.t] = 0;
            this.bootinx[this.t] = [];
        }
        this.event(line);
        this.ecode = null;
        this.emod = null;
    }

    event(line) {
        this.advance(line[4], line.slice(5, 8));
        if (this.o === 3) this.cycleInning();
    }

    sub(line) {
        const [t, lpos, fpos, offense] = [2, 3, 4, 5].map((i) => Number(line[i]));
        if (offense) {
            if (fpos > 9) {
                if (fpos === 10) {
                    // pinch hit
                    if (this.lp !== lpos) throw this.simError(`Pinchit Discrepancy lp[${this.lp}] lpos[${lpos}]`);
                }
            } else if (lpos >= 0) this.lpos[t][lpos] = fpos;
        } else {
            if (fpos > 9) throw this.simError(`defensive pinch sub [${fpos}]`);
            if (lpos >= 0) this.lpos[t][lpos] = fpos;
        }
    }

    boot(line) {
        if (Number(line[1]) !== this.t) throw this.simError(`BOOT team error b[${line[1]}] != sim[${this.t}]`);
        this.bootinx[this.t].push(Number(line[2]));
        this.bootflg[this.t] = 1;
    }

    padj(line) {
        // nothing
    }

    badj(line) {
        // nothing
    }

    final(data) {
        // nothing
    }

    bitindexes(flag) {
        let i = 0,
            f = flag;
        const inx = [];
        while (f > 0) {
            if (f & 1) {
                inx.push(i);
            }
            f >>= 1;
            i += 1;
        }
        return inx;
    }

    advance(badv, radv) {
        let advflg = 0;
        for (let i = 0, a; i < radv.length; i += 1) {
            a = radv[i];
            if (a.length === 0) continue;
            if (a.charAt(0) === 'X') {
                this.outinc();
                this.bflg ^= 1 << i;
            } else if (a.charAt(0) === 'H') {
                this.scorerun(a.slice(2));
                this.bflg ^= 1 << i;
            } else if (i !== Number(a.charAt(0)) - 1) {
                advflg |= 1 << i;
            }
        }
        this.bitindexes(advflg).reverse().forEach((i) => {
            this.bflg = (this.bflg ^ 1 << i) | (1 << Number(radv[i].charAt(0)) - 1);
        }, this);
        if (badv.length > 0) {
            if (badv.charAt(0) === 'X') {
                this.outinc();
            } else if (badv.charAt(0) === 'H') {
                this.scorerun(badv.slice(2));
            } else {
                this.bflg |= 1 << Number(badv.charAt(0)) - 1;
            }
            this.cycleLineup();
        }
    }

    checkRbi(rbi, norbi) {
        if (rbi === 1 && norbi === 1) throw this.simError('Both rbi and norbi flags present');
        if (rbi === 1) return true;
        if (norbi === 1) return false;
        return (this.ecode <= 10 && !this.emod.includes('GDP'));
    }

    scorerun(flag) {
        this.score[this.t] += 1;
    }

    outinc() {
        this.o += 1;
        this.totouts[this.t] += 1;
    }

    cycleInning() {
        while (this.bflg > 0) {
            this.lob[this.t] += (this.bflg & 1);
            this.bflg = this.bflg >> 1;
        }
        this.o = 0;
        this.i += 1;
        this.t ^= 1;
    }

    cycleLineup() {
        if (this.bootflg[this.t]) {
            this.bootflg[this.t] <<= 1;
        } else {
            this.abinx[this.t] = (this.abinx[this.t] + 1) % 9;
        }
    }
}

module.exports = GameSim;