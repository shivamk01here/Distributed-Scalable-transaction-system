const express = require('express');
const pool = require('./db');
const redis = require('redis');

const app = express();
app.use(express.json());

// Initialize Redis Client
const redisClient = redis.createClient({
  url: 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('📦 Connected to Redis!'));

// Get transactions for a specific user (V2 with Cache)
app.get('/transactions/:userId', async (req, res) => {
  const { userId } = req.params;
  const cacheKey = `user_tx_${userId}`;
  
  try {
    // STEP 1: Check Redis cache first
    const cachedData = await redisClient.get(cacheKey);
    
    if (cachedData) {
      // CACHE HIT 🎯 - Return immediately, don't touch Postgres
      return res.json({
        success: true,
        source: 'redis',
        data: JSON.parse(cachedData)
      });
    }

    // STEP 2: CACHE MISS ❌ - Query PostgreSQL
    const result = await pool.query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [userId]
    );
    
    // STEP 3: Save to Redis for next time (Expire after 60 seconds)
    await redisClient.setEx(cacheKey, 60, JSON.stringify(result.rows));
    
    res.json({
      success: true,
      source: 'postgres',
      count: result.rowCount,
      data: result.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = 3000;

// Connect to Redis before starting server
redisClient.connect().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Gateway V2 (Cached) running on http://localhost:${PORT}`);
  });
});