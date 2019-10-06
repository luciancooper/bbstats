class StatIndexer {
    constructor(...keys) {
        this.keys = keys;
        this.keymap = keys.reduce((acc, s, i) => {
            acc[s] = i;
            return acc;
        }, {});
    }

    get length() {
        return this.keys.length;
    }

    emptySet(dim = 0) {
        if (dim) {
            return Array(dim).fill(this.length).map((l) => Array(l).fill(0));
        }
        return Array(this.length).fill(0);
    }

    index(key) {
        return this.keymap[key];
    }

    apply(acc, ...keys) {
        for (let i = 0; i < keys.length; i += 1) {
            acc[this.index(keys[i])] += 1;
        }
    }
}

module.exports = StatIndexer;