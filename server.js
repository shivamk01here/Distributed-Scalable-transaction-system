const express = require('express');
const pool = require('./db');
const redis = require('redis');
const { Kafka } = require('kafkajs');

const app = express();
app.use(express.json());

const redisClient = redis.createClient({ url: 'redis://localhost:6379' });
redisClient.connect().catch(console.error);

const kafka = new Kafka({
  clientId: 'payment-gateway',
  brokers: ['localhost:9092']
});
const producer = kafka.producer();

app.post('/pay', async (req, res) => {
  const { userId, amount } = req.body;

  try {
    await producer.send({
      topic: 'incoming-payments',
      messages: [
        { value: JSON.stringify({ userId, amount, status: 'PENDING', timestamp: Date.now() }) }
      ],
    });

    res.status(202).json({
      success: true,
      message: 'Payment is processing'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

app.get('/transactions/:userId', async (req, res) => {
  const { userId } = req.params;
  const cacheKey = `user_tx_${userId}`;
  
  try {
    const cachedData = await redisClient.get(cacheKey);
    
    if (cachedData) {
      return res.json({
        success: true,
        source: 'redis',
        data: JSON.parse(cachedData)
      });
    }

    const result = await pool.query(
      'SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [userId]
    );
    
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
producer.connect().then(() => {
  app.listen(PORT, () => {
    console.log(` Gateway V3 (Kafka Producer) running on http://localhost:${PORT}`);
  });
});