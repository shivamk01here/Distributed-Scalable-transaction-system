const pool = require('./db');
const { faker } = require('@faker-js/faker');

async function seed() {
  console.log('Starting database seed... 🚀');
  
  // Create table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(50) NOT NULL,
      amount DECIMAL(10, 2) NOT NULL,
      status VARCHAR(20) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  
  // Clear existing data for a fresh start
  await pool.query('TRUNCATE TABLE transactions');

  const targetRows = 1000000;
  const batchSize = 10000;
  
  // We simulate a system where some power users have a lot of transactions
  const userIds = Array.from({ length: 1000 }, () => faker.string.uuid());

  for (let i = 0; i < targetRows; i += batchSize) {
    const values = [];
    const placeholders = [];
    
    for (let j = 0; j < batchSize; j++) {
      const offset = j * 3;
      placeholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3})`);
      values.push(
        userIds[Math.floor(Math.random() * userIds.length)], // Random user
        faker.finance.amount({ min: 10, max: 5000, dec: 2 }), // Random amount
        faker.helpers.arrayElement(['SUCCESS', 'PENDING', 'FAILED']) // Status
      );
    }

    const query = `
      INSERT INTO transactions (user_id, amount, status)
      VALUES ${placeholders.join(', ')}
    `;
    
    await pool.query(query, values);
    console.log(`Inserted ${i + batchSize} / ${targetRows} rows...`);
  }

  console.log('✅ Seeding complete!');
  process.exit();
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});