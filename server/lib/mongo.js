const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DBNAME || 'ecosphere';

let client = null;
let db = null;

async function connect() {
    if (!uri) {
        console.warn('MONGODB_URI not set, MongoDB is disabled.');
        return null;
    }

    if (db) return db;

    try {
        client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
        await client.connect();
        db = client.db(dbName);
        console.log('Connected to MongoDB:', dbName);
        return db;
    } catch (err) {
        console.error('MongoDB connection error:', err.message);
        return null;
    }
}

async function getDb() {
    if (db) return db;
    return await connect();
}

module.exports = {
    connect,
    getDb
};