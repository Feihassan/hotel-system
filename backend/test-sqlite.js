const { getDb, initializeDatabase } = require('./config/sqlite');

async function test() {
  await initializeDatabase();
  console.log('DB ready:', !!getDb());
  if (getDb()) {
    try {
      const stmt = getDb().prepare('SELECT * FROM users');
      const users = stmt.all();
      console.log('Users:', users);
    } catch (e) {
      console.error('Error:', e);
    }
  }
}

test();