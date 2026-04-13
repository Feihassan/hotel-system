const { Pool } = require('pg');
require('dotenv').config();

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'hotel_management',
  user: process.env.DB_USER || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

// Don't include password field if it's empty
if (process.env.DB_PASSWORD) {
  config.password = process.env.DB_PASSWORD;
}

const pool = new Pool(config);

module.exports = pool;
