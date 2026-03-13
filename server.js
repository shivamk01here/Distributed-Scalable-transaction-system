const express = require('express');
const { readPool } = require('./db');
const redis = require('redis');
const { Kafka } = require('kafkajs');

const app = express();
app.use(express.json());

const redisClient = redis.createClient({ url: 'redis://localhost:6379' });
redisClient.on('error', (err) => console.error('Redis Error:', err));
redisClient.connect()
  .then(() => console.log('Connected to Redis!'))
  .catch(console.error);

const rateLimiter = async (req, res, next) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local-ip';
  const redisKey = `rate_limit_${clientIp}`;
  const MAX_REQUESTS = 5; 
  const WINDOW_SECONDS = 10; 

  try {
    const currentRequests = await redisClient.incr(redisKey);

    if (currentRequests === 1) {
      await redisClient.expire(redisKey, WINDOW_SECONDS);
    }

    if (currentRequests > MAX_REQUESTS) {
      console.warn(`Rate limit exceeded for IP: ${clientIp}`);
      return res.status(429).json({ 
        success: false, 
        error: 'Too Many Requests. Please slow down.' 
      });
    }

    next(); 
  } catch (err) {
    console.error('Redis Rate Limiter failed:', err);
    next(); 
  }
};

app.use(rateLimiter);

const kafka = new Kafka({
  clientId: 'payment-gateway',
  brokers: ['localhost:9092']
});
const producer = kafka.producer();

app.post('/pay', async (req, res) => {
  const { userId, amount } = req.body;
  const idempotencyKey = req.headers['x-idempotency-key'];

  console.log(`\n[DEBUG] POST /pay hit! Idempotency Key: ${idempotencyKey}`);

  if (!idempotencyKey) {
    console.log('[DEBUG] Blocked: Missing Header');
    return res.status(400).json({ error: 'x-idempotency-key header is required' });
  }

  const redisKey = `idempotency_${idempotencyKey}`;

  try {
    const isNewRequest = await redisClient.set(redisKey, 'LOCKED', {
      NX: true,
      EX: 86400 
    });

    console.log(`[DEBUG] Redis SET NX Result: ${isNewRequest}`);

    if (!isNewRequest) {
      console.warn(`Blocked duplicate payment for key: ${idempotencyKey}`);
      return res.status(409).json({
        success: false,
        message: 'Duplicate payment request detected. Already processing.'
      });
    }

    await producer.send({
      topic: 'incoming-payments',
      messages: [
        { value: JSON.stringify({ userId, amount, status: 'PENDING', timestamp: Date.now() }) }
      ],
    });

    console.log(`Payment sent to Kafka for: ${idempotencyKey}`);
    res.status(202).json({ success: true, message: 'Payment is processing' });

  } catch (err) {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

app.get('/transactions/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await readPool.query(
      'SELECT * FROM transactions_partitioned WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [userId]
    );
    res.json({ success: true, count: result.rowCount, data: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = 3000;
producer.connect().then(() => {
  app.listen(PORT, () => {
    console.log(`Gateway V4 (Idempotent API) running on http://localhost:${PORT}`);
  });
});