const { Kafka } = require('kafkajs');
const { writePool } = require('./db');
const redis = require('redis');

const redisClient = redis.createClient({ url: 'redis://localhost:6379' });
redisClient.connect().catch(console.error);

const kafka = new Kafka({
  clientId: 'payment-worker',
  brokers: ['localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'payment-db-writers' });
const producer = kafka.producer(); 

async function runWorker() {
  await producer.connect();
  await consumer.connect();
  await consumer.subscribe({ topic: 'incoming-payments', fromBeginning: true });

  console.log('👷 Worker started. Listening for payments & managing cache...');

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const traceId = message.headers['x-trace-id']?.toString() || 'unknown';
      const paymentData = JSON.parse(message.value.toString());
      
      try {
        // 1. Save to Database
        await writePool.query(
          'INSERT INTO transactions_partitioned (user_id, amount, status) VALUES ($1, $2, $3)',
          [paymentData.userId, paymentData.amount, paymentData.status]
        );
        
        // 2. Clear cache on success
        const cacheKey = `user_tx_${paymentData.userId}`;
        await redisClient.del(cacheKey);
        
        console.log(`[TRACE: ${traceId}] ✅ Processed payment for: ${paymentData.userId}`);
      } catch (err) {
        console.error(`[TRACE: ${traceId}] ❌ Processing Failed for ${paymentData.userId}. Routing to DLQ...`);
        
        await producer.send({
          topic: 'dead-letter-payments',
          messages: [
            { 
              value: message.value.toString(), 
              headers: { 
                ...message.headers,
                error_reason: err.message 
              } 
            }
          ],
        });
        console.log(`[TRACE: ${traceId}] 📤 Successfully moved message to DLQ (dead-letter-payments)`);
      }
    },
  });
}

runWorker().catch(console.error);