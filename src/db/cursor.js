class DataCursor {
    constructor(cursor) {
        this.cursor = cursor;
    }

    async array() {
        try {
            return await this.cursor.toArray();
        } catch (e) {
            return [];
        }
    }

    async each(cb, thisArg) {
        for (let doc = await this.cursor.next(); doc != null; doc = await this.cursor.next()) {
            cb.call(thisArg, doc);
        }
    }

    async map(cb, thisArg) {
        const results = [];
        for (let doc = await this.cursor.next(); doc != null; doc = await this.cursor.next()) {
            results.push(cb.call(thisArg, doc));
        }
        return results;
    }

    async reduce(cb, first, thisArg) {
        let acc = first,
            doc = await this.cursor.next();
        if (acc == null) {
            acc = doc;
            if (doc != null) {
                doc = await this.cursor.next();
            }
        }
        while (doc != null) {
            acc = cb.call(thisArg, acc, doc);
            doc = await this.cursor.next();
        }
        return acc;
    }
}

module.exports = DataCursor;