class ChunkedJSON {
    constructor(res) {
        this.res = res;
    }

    open() {
        this.count = 0;
        this.res.set('Content-Type', 'application/json');
        this.res.write('[');
        return this;
    }

    write(...items) {
        if (items.length) {
            if (this.count) this.res.write(',');
            this.res.write(items.map((o) => JSON.stringify(o)).join(','));
            this.count += items.length;
        }
        return this;
    }

    close() {
        this.res.write(']');
        this.res.end();
        return this;
    }
}

module.exports = ChunkedJSON;