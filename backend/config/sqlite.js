const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'hotel_management.db');
let db;
let isInitialized = false;

// Initialize database
const initializeDatabase = async () => {
  try {
    const SQL = await initSqlJs();
    let filebuffer;
    
    try {
      filebuffer = fs.readFileSync(dbPath);
      console.log('Existing database file loaded');
    } catch (err) {
      // Database doesn't exist, create new one
      console.log('Creating new database file');
      filebuffer = null;
    }
    
    db = new SQL.Database(filebuffer);
    
    // Save database to file when changes are made (Atomically)
    const saveDb = () => {
      try {
        const data = db.export();
        const tmpPath = dbPath + '.tmp';
        fs.writeFileSync(tmpPath, Buffer.from(data));
        fs.renameSync(tmpPath, dbPath);
      } catch (err) {
        console.error('Error saving database:', err);
      }
    };
    
    // Add save method to db
    db.saveToFile = saveDb;
    
    // Polyfill Statement.prototype.all for sql.js compatibility with better-sqlite3 API
    const dummyStmt = db.prepare('SELECT 1');
    const StatementClass = dummyStmt.constructor;
    if (!StatementClass.prototype.all) {
      StatementClass.prototype.all = function(params) {
        if (params) {
          this.bind(params);
        }
        const results = [];
        while (this.step()) {
          results.push(this.getAsObject());
        }
        this.free();
        return results;
      };
    }
    
    // Polyfill Statement.prototype.run to return { changes, lastInsertRowid }
    const originalRun = StatementClass.prototype.run;
    StatementClass.prototype.run = function(params) {
      originalRun.call(this, params);
      let lastInsertRowid = 0, changes = 0;
      try {
        const resId = db.exec('SELECT last_insert_rowid()');
        if (resId.length > 0 && resId[0].values.length > 0) {
          lastInsertRowid = resId[0].values[0][0];
        }
        const resCh = db.exec('SELECT changes()');
        if (resCh.length > 0 && resCh[0].values.length > 0) {
          changes = resCh[0].values[0][0];
        }
      } catch (err) {}
      return { changes, lastInsertRowid };
    };
    
    dummyStmt.free();

    isInitialized = true;
    console.log('SQLite database initialized successfully');
    
    return db;
  } catch (error) {
    console.error('Failed to initialize SQLite database:', error);
    throw error;
  }
};

module.exports = { 
  getDb: () => {
    if (!isInitialized || !db) {
      console.warn('Database not yet initialized');
      return null;
    }
    return db;
  },
  initializeDatabase
};