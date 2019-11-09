/* eslint-disable no-param-reassign */
function union(a, b) {
    const u = new Set(a);
    b.forEach((x) => {
        u.add(x);
    });
    return u;
}

function difference(a, b) {
    const d = new Set(a);
    b.forEach((x) => {
        d.delete(x);
    });
    return d;
}

function list_extract(v, l) {
    const items = (typeof v === 'string') ? [v] : v,
        i = l.findIndex((x) => items.includes(x));
    return i < 0 ? [null, l] : [l[i], l.slice(0, i).concat(l.slice(i + 1))];
}

function bititer(flag, span) {
    const bits = [];
    for (let i = 0; i < span; i += 1) {
        bits.push(flag & 1);
        flag >>= 1;
    }
    return bits;
}

function splitParen(s) {
    const split = [];
    for (let str = s, j; str.length > 0; str = str.slice(j + 1)) {
        j = str.indexOf(')', 1);
        split.push(str.slice(1, j));
    }
    return split;
}

function splitLine(line) {
    const split = [];
    let i = 0,
        j;
    while (i < line.length) {
        if (line[i] === '"') {
            j = line.indexOf('"', i + 1);
            split.push(line.slice(i + 1, j));
            i = j + 2;
        } else {
            j = line.indexOf(',', i);
            if (j < 0) {
                split.push(line.slice(i));
                return split;
            }
            split.push(line.slice(i, j));
            i = j + 1;
        }
    }
    if (i === line.length && line[i - 1] === ',') {
        split.push('');
    }
    return split;
}

function splitEvent(e) {
    const split = [];
    let i = 0,
        a = e.indexOf('/'),
        b = e.indexOf('('),
        c;
    if (a > 0 && (b < 0 || a < b) && e.slice(a + 1, a + 3) === 'TH' && /E\d$/.test(e.slice(0, a))) {
        a = e.indexOf('/', a + 1);
        if (a < 0) return [e];
        split.push(e.slice(0, a));
        i = a + 1;
        a = e.indexOf('/', a + 1);
    }
    while (a > 0) {
        if (b < 0 || a < b) {
            split.push(e.slice(i, a));
            i = a + 1;
            a = e.indexOf('/', a + 1);
        } else {
            c = e.indexOf(')', b + 1);
            if (a < c) a = e.indexOf('/', c + 1);
            b = e.indexOf('(', c + 1);
        }
    }
    split.push(e.slice(i));
    return split;
}

function splitOuts(e) {
    const split = [];
    let x = 0,
        i = e.indexOf('('),
        i2 = -1,
        j;
    if (i < 0) return [['B', e]];
    while (i >= 0) {
        j = e.indexOf(')', i + 1);
        split.push([
            e.slice(i + 1, j),
            (i2 < 0) ? e.slice(x, i) : (e[i2] !== e[x] ? e[i2] + e.slice(x, i) : e.slice(x, i)),
        ]);
        [x, i, i2] = [j + 1, e.indexOf('(', j + 1), i - 1];
    }
    if (x < e.length) {
        split.push(['B', e[i2] !== e[x] ? e[i2] + e.slice(x) : e.slice(x)]);
    }
    return split;
}

const baseIndex = {
    B: 0,
    1: 1,
    2: 2,
    3: 3,
    H: 4,
};

function adv_pbwp(adv) {
    const m = adv.map((x, i) => (x != null ? [i, x] : null)).filter((x) => x);
    let i,
        x,
        flg,
        j,
        f,
        z;
    for (z = 0; z < m.length; z += 1) {
        [i, [x, flg]] = m[z];
        j = flg.findIndex((v) => v === 'PB' || v === 'WP');
        if (j < 0) continue;
        f = flg[j];
        flg = flg.slice(0, j).concat(flg.slice(j + 1));
        break;
    }
    if (z === m.length) return null;
    adv[i] = [x, flg];
    return f;
}

function adv_format(adv, def) {
    return adv.map((x, i) => (x != null ? [i, x] : null)).filter((x) => x).map(([i, [b, flgs]]) => {
        const errors = flgs.filter((x) => x[0] === 'E').map((x) => (x.endsWith('/TH') ? 'ET' : 'ER') + x[1]);
        def[2] = [...def[2], ...errors.map((e) => e[2]).sort()].sort().join('');
        // OBS & BINT should be pulled out and put into mods
        flgs = flgs.filter((x) => x[0] !== 'E' && x !== 'TH').map((x) => x.replace(/\/(?:TH|AP|OBS|BINT)/g, ''));
        if (b === 'H') {
            // Extract run info from flags
            let ur,
                tur,
                rbi,
                norbi;
            [ur, flgs] = list_extract(['UR'], flgs);
            [tur, flgs] = list_extract(['TUR'], flgs);
            [rbi, flgs] = list_extract(['RBI'], flgs);
            [norbi, flgs] = list_extract(['NR', 'NORBI'], flgs);
            b = `${b}/R${ur ? 1 : 0}${tur ? 1 : 0}${rbi ? 1 : 0}${norbi ? 1 : 0}`;
        }
        if (flgs.length === 0) {
            return [i, b];
        }
        // extract defensive info from each flag
        flgs.forEach((flg) => {
            if (flg === '99') return;
            let assist;
            if (/E\d$/.test(flg)) {
                def[2] = [...(def[2] + flg[flg.length - 1])].sort().join('');
                assist = flg.slice(0, -2);
            } else {
                def[1] = [...(def[1] + flg[flg.length - 1])].sort().join('');
                assist = flg.slice(0, -1);
            }
            assist = [...new Set(assist)].sort().join('');
            def[0] = [...(def[0] + assist)].sort().join('');
        });
        return [i, b];
    });
}

function adv_merge(adv, i, j, flg) {
    if (typeof i === 'string') {
        i = baseIndex[i];
    }
    flg = flg.map((x) => x.replace(/(?<=TH)[123H]/g, ''));
    if (adv[i] == null) {
        adv[i] = [j, flg];
    } else {
        const [x, f] = adv[i];
        adv[i] = [x, flg.concat(f)];
    }
}

function advflg_sortval(flg) {
    if (['WP', 'PB'].includes(flg)) return 13;
    if (['RBI', 'NR', 'NORBI'].includes(flg)) return 12;
    if (['UR', 'TUR'].includes(flg)) return 11;
    if (/^[\dU]+(?:\/(?:TH|BINT|AP)|E\d(?:\/OBS)?)?$/.test(flg)) {
        return /^[\dU]+E\d(?:\/OBS)?$/.test(flg) ? 0 : -1;
    }
    if (flg[0] === 'E') return Number(flg[1]);
    if (/^TH[123H]?$/.test(flg)) return 10;
    return 14;
}

function adv_split(advances) {
    // %-%(XX)(XX) or %X%(XX)(XX)
    return advances.map((adv) => {
        const r = baseIndex[adv[0]],
            i = adv.indexOf('(');
        if (i < 0) {
            return [r, [adv[adv[1] === 'X' ? 1 : 2], []]];
        }
        const flg = splitParen(adv.slice(i))
            .map((x) => x.replace(/(?<=TH)[123H]/g, ''))
            .sort((a, b) => {
                const [x, y] = [advflg_sortval(a), advflg_sortval(b)];
                return (x !== y) ? (x < y ? -1 : 1) : (a !== b) ? (a < b ? -1 : 1) : 0;
            });
        return [r, [adv[(adv[1] !== 'X' || /E\d(?:\/OBS)?$/.test(flg[0])) ? 2 : 1], flg]];
    });
}

function adv_brevt(adv, rnevt) {
    return rnevt.split(';').map((e) => {
        // Split RunEvt
        const p = e.indexOf('(');
        let flg = [],
            b,
            r;
        if (p >= 0) {
            flg = splitParen(e.slice(p)).map((x) => x.replace(/(?<=TH)[123H]/g, ''));
            e = e.slice(0, p);
        }
        [e, b] = [e.slice(0, -1), e[e.length - 1]];
        if (e === 'SB') {
            r = baseIndex[b] - 1;
        } else if (e.slice(-2) === 'CS') {
            [r, b] = [baseIndex[b] - 1, (flg.length && flg[0].includes('E')) ? b : 'X'];
        } else {
            [r, b] = [Number(b), (flg.length && flg[0].includes('E')) ? b : 'X'];
        }
        adv_merge(adv, r, b, flg);
        return `${e}${r}`;
    });
}

function extract_hitloc(...m) {
    for (let i = 0, hl; i < m.length; i += 1) {
        hl = /(?:[12][35]?|34?|[45]6?|78?|89?|[69])(?:D[FW]?|M[DS]?|SF?|XDW?|R(?:[DFMS]|XDW?)?|L(?:D[FW]?|[MS]F?|XDW?|F)?|F)?/.exec(m[i]);
        if (!hl) continue;
        if (hl[0] === m[i]) {
            return [difference(m, [m[i]]), m[i]];
        }
        const j0 = hl.index,
            j1 = j0 + hl[0].length;
        return [union(difference(m, [m[i]]), [m[i].slice(0, j0) + m[i].slice(j1)]), hl[0]];
    }
    return [new Set(m), null];
}

function extract_mods(evt, ...m) {
    // console.log('extract_mods', e, m);
    let hl;
    m = new Set(m);
    if (evt.startsWith('FLE')) m.add('FL');
    m = new Set([...m].map((x) => x.replace(/[+-]/g, '')).filter((x) => x));
    m = new Set([...m].filter((x) => !(/^(?:[RU][\dU]+)+/.test(x) || /TH[123H]?/.test(x))));
    m = difference(m, ['AP', 'C', 'COUB', 'COUF', 'COUR', 'IF', 'IPHR', 'MREV', 'UREV']);
    const err = new Set([...m].filter((x) => /^E\d$/.test(x)));
    m = difference(m, err);
    [m, hl] = extract_hitloc(...m);
    // hit locations in foul territory
    if (hl && hl.endsWith('F')) m.add('FL');
    // bunt foul exception
    if (m.has('BF')) m = union(difference(m, ['BF']), ['BUNT']);
    // add bunt flag if sac hit mod is present
    if (m.has('SH')) m.add('BUNT');
    // separate modifiers
    let bb = new Set(),
        dp = new Set();
    const mod = new Set();
    m.forEach((x) => {
        if (['BGDP', 'BPDP'].includes(x)) {
            mod.add('BUNT');
            bb.add(x[1]);
            dp.add(x.slice(2));
        } else if (['FDP', 'GDP', 'GTP', 'LDP', 'LTP'].includes(x)) {
            bb.add(x[0]);
            dp.add(x.slice(1));
        } else if (['BP', 'BG', 'BL', 'BP'].includes(x)) {
            mod.add('BUNT');
            bb.add(x[1]);
        } else if (['G', 'F', 'L', 'P'].includes(x)) {
            bb.add(x);
        } else if (['DP', 'TP'].includes(x)) {
            dp.add(x);
        } else if (x === 'B') {
            mod.add('BUNT');
        } else if (x === 'FL') {
            mod.add('FOUL');
        } else {
            mod.add(x);
        }
    });
    // handle ground into double/triple plays
    // assert (bb.size <= 1 && dp.size <= 1), `multiple bb or dp modifiers bb:${bb} dp:${dp}`
    bb = bb.size ? [...bb][0] : null;
    dp = dp.size ? [...dp][0] : null;
    // check if ground ball flag is missing
    if (bb === null && (/^(?:FC|\d{2}|\d\([1-3]\))/.test(evt) || mod.has('BUNT'))) {
        bb = 'G';
    }
    // add GDP / GTP modifier
    if (dp === 'DP' && bb === 'G') mod.add('GDP');
    else if (dp === 'TP' && bb === 'G') mod.add('GTP');
    return [evt, [...union(mod, err)].sort()];
}

const zip = (...rows) => [...rows[0]].map((_, c) => rows.map((row) => row[c]));

function addError(d, pos) {
    d[2] = [...(d[2] + pos)].sort().join('');
}

function hitBase(hit) {
    switch (hit) {
        case 'S': return '1';
        case 'D': return '2';
        case 'T': return '3';
        case 'H': return 'H';
        default: throw new Error(`Invalid hit type '${hit}'`);
    }
}

function hitEvent(e) {
    switch (e) {
        case 'S': return 'S';
        case 'D': return 'D';
        case 'T': return 'T';
        case 'H': return 'HR';
        default: throw new Error(`Invalid hit type '${e}'`);
    }
}

function bbEvent(e) {
    switch (e) {
        case 'W': return 'BB';
        case 'I': return 'IBB';
        default: throw new Error(`Invalid walk type '${e}'`);
    }
}

const eventCode = {
    O: 0,
    E: 1,
    K: 2,
    BB: 3,
    IBB: 4,
    HBP: 5,
    I: 6,
    S: 7,
    D: 8,
    T: 9,
    HR: 10,
    WP: 11,
    PB: 12,
    DI: 13,
    OA: 14,
    SB: 15,
    CS: 15,
    PO: 15,
    POCS: 15,
    BK: 16,
    FLE: 17,
};

function eventline(inx, gsim, evt) {
    const adv = new Array(4).fill(null),
        def = new Array(3).fill('');
    let e = evt.toUpperCase().replace(/#/g, '').replace(/!/g, '').replace(/\?/g, ''),
        mod,
        ecode,
        pbwp;
    if (e.includes('.')) {
        let eadv;
        [e, eadv] = e.split('.');
        adv_split(eadv.split(';')).forEach(([i, x]) => {
            adv[i] = x;
        });
    }
    [e, mod] = extract_mods(...splitEvent(e));
    if (['WP', 'PB', 'BK'].includes(e)) {
        // WP PB BK
        ecode = [e];
    } else if (['DI', 'OA'].includes(e)) {
        // DI OA
        pbwp = adv_pbwp(adv);
        ecode = pbwp == null ? [e] : [pbwp];
    } else if (['SB', 'CS', 'PO'].some((x) => e.startsWith(x))) {
        // SB CS PO POCS
        pbwp = adv_pbwp(adv);
        ecode = (pbwp ? [pbwp] : []).concat(adv_brevt(adv, e).sort((x, y) => {
            [x, y] = [Number(x[x.length - 1]), Number(y[y.length - 1])];
            return x < y ? -1 : x > y ? 1 : 0;
        }));
    } else if (e.startsWith('FLE')) {
        ecode = ['FLE'];
        addError(def, e[e.length - 1]);
    } else if (['W', 'I'].some((x) => e.startsWith(x))) {
        pbwp = adv_pbwp(adv);
        if (adv[0] == null) {
            adv[0] = ['1', []];
        }
        ecode = [bbEvent(e[0])];
        if (e.includes('+')) {
            e = e.slice(e.indexOf('+') + 1);
            if (['WP', 'PB', 'DI', 'OA'].includes(e)) {
                // W+WP W+PB W+DI W+OA
                if (pbwp) {
                    if (['DI', 'OA', pbwp].includes(e)) {
                        ecode = ecode.concat([pbwp]);
                    } else {
                        throw new Error(`[${e}] & [${pbwp}] in same event`);
                    }
                } else {
                    ecode = ecode.concat([e]);
                }
            } else if (e[0] === 'E') {
                // W+E#
                addError(def, e[1]);
            } else {
                // W+SB# W+CS# W+PO# W+POCS#
                ecode = (pbwp ? ecode.concat([pbwp]) : ecode).concat(adv_brevt(adv, e).sort((x, y) => {
                    [x, y] = [Number(x[x.length - 1]), Number(y[y.length - 1])];
                    return x < y ? -1 : x > y ? 1 : 0;
                }));
            }
        }
    } else if (e === 'HP') {
        // Hit by Pitch (Ball is dead)
        if (adv[0] == null) {
            adv[0] = ['1', []];
        }
        ecode = ['HBP'];
    } else if (['S', 'D', 'T', 'H'].some((x) => e.startsWith(x))) {
        // Hit (S,D,T,HR)
        if (adv[0] == null) {
            adv[0] = [hitBase(e[0]), []];
        }
        ecode = [hitEvent(e[0])];
    } else if (e.startsWith('K')) {
        pbwp = adv_pbwp(adv);
        ecode = ['K'];
        let kevt;
        if (e.includes('+')) {
            [kevt, e] = e.split('+');
            if (kevt.length > 1) {
                adv_merge(adv, 0, 'X', [kevt.slice(1)]);
            } else if (adv[0] == null) {
                adv[0] = ['X', ['2']];
            }
            if (['WP', 'PB', 'DI', 'OA'].includes(e)) {
                // K+WP K+PB K+DI K+OA
                if (pbwp) {
                    if (['DI', 'OA', pbwp].includes(e)) {
                        ecode = ecode.concat([pbwp]);
                    } else {
                        throw new Error(`[${e}] & [${pbwp}] in same event`);
                    }
                } else {
                    ecode = ecode.concat([e]);
                }
            } else if (e[0] === 'E') {
                addError(def, e[1]);
            } else {
                // K+SB# K+CS# K+PO# K+POCS#
                ecode = (pbwp ? ecode.concat([pbwp]) : ecode).concat(adv_brevt(adv, e).sort((x, y) => {
                    [x, y] = [Number(x[x.length - 1]), Number(y[y.length - 1])];
                    return x < y ? -1 : x > y ? 1 : 0;
                }));
            }
        } else {
            kevt = e;
            if (kevt.length > 1) {
                adv_merge(adv, 0, 'X', [kevt.slice(1)]);
            } else if (adv[0] == null) {
                adv[0] = ['X', ['2']];
            }
        }
    } else if (e.startsWith('C')) {
        adv_merge(adv, 0, '1', [mod[0]]);
        mod = mod.slice(1);
        ecode = ['I'];
    } else {
        if (e.startsWith('E')) {
            adv_merge(adv, 0, '1', [e]);
            ecode = ['E'];
        } else if (e.startsWith('FC')) {
            // adv_merge(a,0,'1',[])
            if (adv[0] == null) adv[0] = ['1', []];
            mod = mod.concat(['FC']);
            ecode = ['O'];
        } else {
            let oadv = splitOuts(e).sort((x, y) => {
                [x, y] = [baseIndex[x[0]], baseIndex[y[0]]];
                return x < y ? -1 : x > y ? 1 : 0;
            });
            ecode = ['O'];
            if (oadv[0][0] === 'B') {
                if (/E\d(?:\/TH[123H]?)?$/.test(oadv[0][1])) {
                    adv_merge(adv, 0, '1', [oadv[0][1]]);
                    oadv = oadv.slice(1);
                    ecode = ['E'];
                }
            } else {
                adv_merge(adv, 0, '1', []);
            }
            oadv.forEach(([i, x]) => {
                adv_merge(adv, baseIndex[i], 'X', [x]);
            });
        }
        let sac;
        [sac, mod] = list_extract(['SF', 'SH'], mod);
        if (sac) {
            ecode = ecode.concat([sac]);
        }
    }
    const ra = new Array(4).fill(null);
    adv_format(adv, def).forEach(([i, x]) => {
        ra[i] = x;
    });
    const runadv = zip([0, 1, 2, 3], bititer(gsim[3] << 1, 4), ra)
        .map(([i, j, x]) => (x != null ? x[0] : j ? String(i) : null));
    // update context
    gsim[2] += runadv.map((x) => (x === 'X' ? 1 : 0)).reduce((p, x) => p + x, 0);
    gsim[3] = runadv.filter((x) => ['1', '2', '3'].includes(x)).map((x) => 1 << Number(x) - 1).reduce((s, i) => s | i, 0);
    // cycle context
    if (gsim[2] === 3) {
        gsim[0] += 1;
        gsim[1] ^= 1;
        gsim[2] = 0;
        gsim[3] = 0;
    }
    // return line
    return [
        inx,
        ecode.join('+'),
        eventCode[ecode[0].replace(/\d/g, '')],
        mod.join('/'),
        ...ra.map((x) => (x == null ? '' : x)),
        ...def,
    ];
}

function subline(line) {
    const pid = line[0].toUpperCase(),
        team = Number(line[1].replace(/[A-Za-z]/g, '')),
        lpos = Number(line[2]) - 1,
        fpos = Number(line[3]) - 1,
        count = line[6],
        midab = (count.length === 2 && /^[0-9]+$/.test(count) && count !== '00') ? count : '',
        t = (team ^ Number(line[4])) ^ 1;
    return `${pid},${team},${lpos},${fpos},${t},${midab}`;
}

function handCode(h) {
    switch (h) {
        case 'R': return 0;
        case 'L': return 1;
        default: throw new Error(`Invalid hand code '${h}'`);
    }
}

function fmtStartTime(startTime) {
    const [h, m, p] = startTime.match(/^(\d+):(\d+)([AP]M)$/).slice(1),
        hour = Number(h) + (p === 'PM' ? 12 : 0);
    return `${hour < 10 ? '0' : ''}${hour}:${m}`;
}

function processGame(lines) {
    let j = 0,
        [i, l] = lines[j],
        k,
        v;
    // assert i === 'g'
    const year = Number(l.slice(3, 7)),
        month = Number(l.slice(7, 9)),
        day = Number(l.slice(9, 11)),
        gn = Number(l[11]),
        date = l.slice(3, 11),
        home = l.slice(0, 3),
        info = {};
    [i, l] = lines[j += 1];
    while (i === 'i') {
        [k, v] = splitLine(l);
        info[k] = v;
        [i, l] = lines[j += 1];
    }
    const {
            visteam: away,
            site,
            wp,
            lp,
            save,
            starttime,
            daynight,
        } = info,
        dh = info.usedh === 'true' ? 1 : 0,
        htbf = info.htbf === 'true' ? 1 : 0,
        pitching = {};
    if (wp) pitching.wp = wp.toUpperCase();
    if (lp) pitching.lp = lp.toUpperCase();
    if (save) pitching.save = save.toUpperCase();
    const bat = [Array(9).fill(null), Array(9).fill(null)],
        pos = [Array(10).fill(null), Array(10).fill(null)];
    while (i === 'l') {
        const pid = l.slice(0, 8),
            t = Number(l[9]),
            bo = Number(l[11]),
            dp = Number(l.slice(13)) - 1;
        pos[t][dp] = pid.toUpperCase();
        if (bo > 0) bat[t][bo - 1] = dp;
        [i, l] = lines[j += 1];
    }
    const events = [],
        gsim = [0, htbf, 0, 0];
    let inx = 0;
    while ('esobp'.includes(i)) {
        l = l.split(',');
        switch (i) {
            case 'o':
                events.push(`O,${inx + 1},${l[0]},${Number(l[1]) - 1}`);
                break;
            case 'b':
                // pid,hand
                events.push(`B,${inx + 1},${handCode(l[1])}`);
                break;
            case 'p':
                // pid,hand
                events.push(`P,${inx + 1},${handCode(l[1])}`);
                break;
            case 's':
                // write S (sub-line) eg [raucj001,0,0,1](pid,t,bo,dp)
                events.push(`S,${inx + 1},${subline(l)}`);
                break;
            default:
                events.push(`E,${eventline(inx += 1, gsim, l[l.length - 1]).join(',')}`);
                break;
        }
        [i, l] = lines[j += 1];
    }
    const er = [];
    while (i === 'd') {
        const [ppid, r] = l.slice(3).split(',');
        if (Number(r) > 0) {
            er.push(`${ppid.toUpperCase()}:${r}`);
        }
        try {
            [i, l] = lines[j += 1];
        } catch (e) {
            break;
        }
    }
    pitching.er = er.join(';');
    return {
        _id: `${date}${home}${away}${gn}`,
        year,
        month,
        day,
        gn,
        home,
        away,
        homeGameNumber: 0,
        awayGameNumber: 0,
        site,
        ...(/^\d+:\d+[AP]M$/.test(starttime) ? { startTime: fmtStartTime(starttime) } : {}),
        ...((daynight === 'day' || daynight === 'night') ? { daynight } : {}),
        dh,
        htbf,
        lineup: [
            [pos[0][0]].concat(bat[0].map((x) => `${pos[0][x]}:${x}`)).join(','),
            [pos[1][0]].concat(bat[1].map((x) => `${pos[1][x]}:${x}`)).join(','),
        ],
        events,
        pitching,
    };
}

module.exports = {
    processGame,
};