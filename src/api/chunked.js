class ChunkedResponse {
    constructor(res) {
        this.res = res;
        this.count = 0;
        res.writeHead(200, {
            'Content-Type': 'application/json',
            'Transfer-Encoding': 'chunked',
        });
        res.write('[');
    }

    write(json) {
        if (this.count) this.res.write(',');
        this.res.write(JSON.stringify(json));
        this.count += 1;
    }

    end() {
        this.res.write(']');
        this.res.end();
    }
}

module.exports = ChunkedResponse;