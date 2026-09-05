#!/usr/bin/env tsx

import { config } from 'dotenv';
config();

if (process.env.REDIS_ENABLED === 'false' || !process.env.REDIS_HOST) {
  console.log('📦 Redis is not enabled (In-Memory mode is active).');
  console.log('ℹ️  You do NOT need to install or run Redis!');
  console.log('   The Next.js application processes travel plan generations directly via the LLM API.');
  process.exit(0);
}

import { worker, dlq1Worker, dlq2Worker } from '../lib/queues';

console.log('Starting BullMQ workers...');

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down workers...');
  await worker.close();
  await dlq1Worker.close();
  await dlq2Worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down workers...');
  await worker.close();
  await dlq1Worker.close();
  await dlq2Worker.close();
  process.exit(0);
});

console.log('Workers started successfully. Press Ctrl+C to stop.');
console.log('Main queue worker: travel-plan-queue');
console.log('DLQ1 worker: travel-plan-dlq1');
console.log('DLQ2 worker: travel-plan-dlq2');

setInterval(() => {
  // Heartbeat to keep process running
}, 30000);