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
