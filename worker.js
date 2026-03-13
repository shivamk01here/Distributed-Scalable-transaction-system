const { Kafka } = require('kafkajs');
const pool = require('./db');

const kafka = new Kafka({
  clientId: 'payment-worker',
  brokers: ['localhost:9092']
});

const consumer = kafka.consumer({ groupId: 'payment-db-writers' });

async function runWorker() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'incoming-payments', fromBeginning: true });

  console.log('Worker started. Listening for payments...');

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const paymentData = JSON.parse(message.value.toString());
      
      try {
        await pool.query(
          'INSERT INTO transactions (user_id, amount, status) VALUES ($1, $2, $3)',
          [paymentData.userId, paymentData.amount, paymentData.status]
        );
        
        console.log(`Saved payment for user: ${paymentData.userId} | Amount: $${paymentData.amount}`);
      } catch (err) {
        console.error('DB Write Failed:', err);
      }
    },
  });
}

runWorker().catch(console.error);