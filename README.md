# High-Throughput Payment Gateway Lab

A high-performance, event-driven payment gateway architecture designed for flash-sale scenarios. This lab demonstrates the evolution from a simple synchronous API to a scalable, asynchronous system using **Kafka** for message queuing and **Redis** for distributed caching.

## Architecture Evolution

### V1: Synchronous Postgres
- Basic CRUD operations.
- Direct database writes and reads.

### V2: Read Optimization (Redis)
- Implemented a caching layer for transaction lookups.
- Reduced database load by ~80% for repeated queries.

### V3: Write Optimization (Kafka)
- Introduced **Kafka** to decouple transaction intake from database persistence.
- Added a background **Worker** to process payments from the queue.
- Implemented **Write-Behind Caching** with cache invalidation in the worker to ensure data consistency.

### V4: Distributed Idempotency (Redis)
- Implemented `x-idempotency-key` enforcement for all payment requests.
- Leveraged Redis `SET NX` for distributed locking to prevent duplicate processing in a multi-instance gateway setup.
- Guaranteed "Exactly-once" request handling even under rapid retry scenarios.

### V5: Reliable Failure Handling (DLQ)
- Implemented **Dead Letter Queue (DLQ)** routing in the background worker.
- Automatically captures failed database writes (e.g., schema violations, transient issues) and routes them to a `dead-letter-payments` topic.
- Preserves original message data and attaches error reasons in Kafka headers for downstream auditing and manual recovery.

### V6: Adaptive Throttling (Redis)
- Implemented **IP-based Rate Limiting** using Redis as a high-speed counter.
- Prevents API abuse and ensures system stability during high-traffic spikes (e.g., flash sales).
- Configured with a sliding window to provide smooth traffic shaping and immediate protection against brute-force or DDoS-like activity.

### High Availability & Scale (Final Architecture)
- **Database Partitioning:** Migrated to `transactions_partitioned` table with range partitioning for optimized indexing and data aging.
- **Dual Connection Pools:** Implemented `readPool` (max: 50) and `writePool` (max: 20) in `db.js` to prevent connection exhaustion during concurrent flash sale spikes.
- **Load Balancing:** Gateway API now prioritizes `readPool` for transaction history and `writePool` for critical persistence tasks.

## Tech Stack
- **Runtime:** Node.js
- **Database:** PostgreSQL
- **Caching:** Redis
- **Message Broker:** Apache Kafka (Bitnami)
- **Containerization:** Docker & Docker Compose

## Performance Metrics
- **Throughput:** ~2,000+ requests per second (validated via Autocannon).
- **Latency:** ~45ms average latency for write operations (asynchronous).

## Setup & Run

1. **Start Infrastructure:**
   ```bash
   docker-compose up -d
   ```

2. **Run Gateway API:**
   ```bash
   node server.js
   ```

3. **Run Background Worker:**
   ```bash
   node worker.js
   ```

4. **Trigger Test Payment:**
   ```bash
   curl -X POST http://localhost:3000/pay -H "Content-Type: application/json" -d '{"userId": 1, "amount": 100}'
   ```
