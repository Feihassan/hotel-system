const pool = require('./config/database');
const bcrypt = require('bcryptjs');

async function testConnection() {
  try {
    console.log('Testing database connection...');
    const client = await pool.connect();
    console.log('✓ Database connected successfully');
    
    // Check if users table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✓ Users table exists');
      
      // Check if admin user exists
      const adminCheck = await client.query('SELECT * FROM users WHERE username = $1', ['admin']);
      
      if (adminCheck.rows.length > 0) {
        console.log('✓ Admin user exists');
        
        // Update admin password with correct hash
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await client.query('UPDATE users SET password = $1 WHERE username = $2', [hashedPassword, 'admin']);
        console.log('✓ Admin password updated');
      } else {
        console.log('Creating admin user...');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await client.query(
          'INSERT INTO users (username, password, full_name, role) VALUES ($1, $2, $3, $4)',
          ['admin', hashedPassword, 'System Administrator', 'admin']
        );
        console.log('✓ Admin user created');
      }
    } else {
      console.log('Users table does not exist. Run init-db.js first.');
    }
    
    client.release();
    process.exit(0);
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();