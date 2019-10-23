function parseLines(chunk) {
    return chunk.split('\n').map((l) => l.trim()).map((l) => {
        if (l === '') return null;
        if (l.startsWith('id')) return ['g', l.slice(3)];
        if (l.startsWith('info')) return ['i', l.slice(5)];
        if (l.startsWith('play')) return ['e', l.slice(5)];
        if (l.startsWith('data')) return ['d', l.slice(5)];
        if (l.startsWith('ladj')) return ['o', l.slice(5)];
        if (l.startsWith('padj')) return ['p', l.slice(5)];
        if (l.startsWith('badj')) return ['b', l.slice(5)];
        if (l.startsWith('start')) {
            const line = l.slice(6).split(',');
            return ['l', `${line[0]},${line.slice(2).join(',')}`];
        }
        if (l.startsWith('sub')) {
            const line = l.slice(4).split(',');
            return ['s', `${line[0]},${line.slice(2).join(',')}`];
        }
        if (l.startsWith('com')) {
            const line = l.slice(5, -1);
            if (line.startsWith('ej,')) return ['j', line.slice(3)];
            if (line.startsWith('umpchange,')) return ['u', line.slice(10)];
            if (line.startsWith('replay,')) return ['r', line.slice(7)];
            return ['c', `"${line}"`];
        }
        return null;
    }).filter((l) => l);
}

function parseGame(chunk) {
    const lines = parseLines(chunk),
        processed = [];
    let x = 0,
        [_i, _l] = lines[x],
        i,
        l;
    try {
        while (x < lines.length) {
            [i, l] = lines[x += 1];
            if (_i === 'e') {
                if (_l.endsWith(',NP')) {
                    if (i === 's') {
                        const s = l.split(','),
                            e = _l.slice(0, -3).split(',').slice(1);
                        processed.push(['s', s.concat(e).join(',')]);
                        [i, l] = lines[x += 1];
                        while (i === 'c') [i, l] = lines[x += 1];
                        [_i, _l] = [i, l];
                    } else if (i === 'u') {
                        [i, l] = lines[x += 1];
                        while (i === 'u') [i, l] = lines[x += 1];
                        while (i === 'c') [i, l] = lines[x += 1];
                    } else if (i === 'j') {
                        [i, l] = lines[x += 1];
                        while (i === 'j') [i, l] = lines[x += 1];
                        while (i === 'c') [i, l] = lines[x += 1];
                    } else if (i === 'c') {
                        while (i === 'c') [i, l] = lines[x += 1];
                    }
                    [_i, _l] = [i, l];
                } else {
                    processed.push(['e', _l]);
                    while (i === 'c') [i, l] = lines[x += 1];
                    [_i, _l] = [i, l];
                }
            } else {
                if ('gildobprju'.includes(_i)) {
                    processed.push([_i, _l]);
                    [_i, _l] = [i, l];
                } else if (_i === 'c') {
                    throw new Error(`Unrecognized ID [${_i}]\n${_i},${_l}\n${i},${l}`);
                }
                while (i === 'c') [i, l] = lines[x += 1];
                [_i, _l] = [i, l];
            }
        }
    } catch (e) {
        // Nothing
    }
    return processed;
}

module.exports = {
    parseGame,
};