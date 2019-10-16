class ChunkedCSV {
    constructor(res) {
        this.res = res;
    }

    open(...head) {
        this.res.set('Content-Type', 'text/csv');
        if (head.length) {
            this.res.write(`${head.join(',')}\n`);
        }
        return this;
    }

    write(...lines) {
        this.res.write(lines.map((l) => `${l}\n`).join(''));
        return this;
    }

    close() {
        this.res.end();
        return this;
    }
}

module.exports = ChunkedCSV;