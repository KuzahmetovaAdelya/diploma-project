import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./db.db', (err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
    } else {
        console.log('Connected to SQLite database.');
    }
});

export default db;