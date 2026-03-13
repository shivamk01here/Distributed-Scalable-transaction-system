const { Pool } = require('pg');

const pool = new Pool({
  user: 'admin',
  host: 'localhost',
  database: 'payments_db',
  password: 'password',
  port: 5432,
});

module.exports = pool;