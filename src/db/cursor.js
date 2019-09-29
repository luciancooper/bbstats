class DataCursor {
    constructor(cursor) {
        this.cursor = cursor;
    }

    async array() {
        try {
            return await this.cursor.toArray();
        } catch (e) {
            return null;
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
}

module.exports = DataCursor;