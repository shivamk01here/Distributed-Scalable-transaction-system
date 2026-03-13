const { Pool } = require('pg');

const writePool = new Pool({
  user: 'admin',
  host: 'localhost', 
  database: 'payments_db',
  password: 'password',
  port: 5432,
  max: 20, 
});

const readPool = new Pool({
  user: 'admin',
  host: 'localhost', 
  database: 'payments_db',
  password: 'password',
  port: 5432, 
  max: 50, 
});

module.exports = {
  writePool,
  readPool
};