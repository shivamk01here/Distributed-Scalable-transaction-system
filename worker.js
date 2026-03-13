const { Kafka } = require('kafkajs');
const pool = require('./db');
const redis = require('redis');

// 1. Give the worker access to Redis
const redisClient = redis.createClient({ url: 'redis://localhost:6379' });
redisClient.connect().catch(console.error);

const kafka = new Kafka({
  clientId: 'payment-worker',
  brokers: ['localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'payment-db-writers' });

async function runWorker() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'incoming-payments', fromBeginning: true });

  console.log('👷 Worker started. Listening for payments & managing cache...');

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const paymentData = JSON.parse(message.value.toString());
      
      try {
        // 1. Save to Database
        await pool.query(
          'INSERT INTO transactions (user_id, amount, status) VALUES ($1, $2, $3)',
          [paymentData.userId, paymentData.amount, paymentData.status]
        );
        
        // 2. Clear user cache to ensure read consistency
        const cacheKey = `user_tx_${paymentData.userId}`;
        await redisClient.del(cacheKey);
        
        console.log(`✅ Processed payment & cleared cache for: ${paymentData.userId}`);
      } catch (err) {
        console.error('❌ Processing Failed:', err);
      }
    },
  });
}

runWorker().catch(console.error);