const { MongoClient } = require('mongodb');

let db = null;

module.exports = {
    db() {
        return db;
    },
    initPool(callback) {
        MongoClient.connect(process.env.DATABASE_URL, {
            poolSize: process.env.POOL_SIZE || 5,
            useNewUrlParser: true,
            useUnifiedTopology: true,
        }, (err, client) => {
            if (err) {
                callback(err);
                return;
            }
            db = client.db();
            console.log(`Connected to database '${client.s.options.dbName}'`);
            callback(null);
        });
    },
};