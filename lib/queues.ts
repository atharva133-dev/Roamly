import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { config } from 'dotenv';
import redis from './redis';
import { generateTravelPlanDirect, TravelDetails as BaseTravelDetails } from './generate-plan';

// Load environment variables
config();

// Extend the shared TravelDetails with queue-specific tracking fields
interface TravelDetails extends BaseTravelDetails {
  requestKey?: string;
  inputHash?: string;
}

const isRedisDisabled =
  process.env.REDIS_ENABLED === 'false' ||
  !process.env.REDIS_HOST ||
  process.env.REDIS_HOST === 'none';

let travelPlanQueue: any;
let dlq1: any;
let dlq2: any;
let worker: any;
let dlq1Worker: any;
let dlq2Worker: any;
let queueRedis: any;

// Generate travel plan — calls Gemini directly (no circular HTTP self-call)
// This is critical for Vercel serverless where setTimeout + self-fetch breaks
async function generateTravelPlan(data: TravelDetails) {
  try {
    console.log('[Queue] Calling Gemini directly via shared lib...');
    const plan = await generateTravelPlanDirect(data);
    console.log('[Queue] ✅ Plan generated successfully');
    return plan;
  } catch (error) {
    console.error('[Queue] generateTravelPlanDirect failed, using structured fallback:', error);

    // Fallback: return structured placeholder so the user gets something
    const { destinations, start_date, end_date, budget, travel_style, accommodation } = data;
    const duration =
      Math.ceil(
        (new Date(end_date).getTime() - new Date(start_date).getTime()) / (1000 * 60 * 60 * 24),
      ) + 1;
    const itinerary = [];
    for (let i = 1; i <= duration; i++) {
      const city = destinations[(i - 1) % destinations.length];
      itinerary.push({
        day: `Day ${i}`,
        city,
        morning: `Explore ${city} - Morning activities`,
        afternoon: `Continue exploring ${city}`,
        evening: `Evening in ${city} - Local experiences`,
        accommodation: accommodation || 'Hotel',
        meals: 'Local cuisine recommendations',
        estimated_cost: `₹${Math.floor(Math.random() * 1000) + 500}`,
      });
    }
    return {
      itinerary,
      total_estimated_cost: `₹${Math.floor(Math.random() * 5000) + 2000}`,
      travel_tips: [
        'Pack comfortable walking shoes',
        'Check local weather',
        'Learn basic local phrases',
        `Focus on ${travel_style} experiences`,
      ],
      packing_list: [
        'Passport and travel documents',
        'Comfortable clothing',
        'Travel adapter',
        'First aid kit',
        'Camera',
      ],
      emergency_contacts: {
        local_emergency: '112',
        embassy: 'Check local embassy',
        hotel: 'Hotel reception',
      },
    };
  }
}

if (isRedisDisabled) {
  // ── In-Memory Queue Fallback ─────────────────────────────────────────────
  const dummyWorker = {
    close: async () => {},
    on: () => dummyWorker,
  };

  travelPlanQueue = {
    add: async (name: string, data: any, opts: any) => {
      const jobId = opts?.jobId || data?.requestKey || 'job-' + Date.now();
      console.log(`[In-Memory Queue] Processing job ${jobId} without Redis...`);
      setTimeout(async () => {
        try {
          const travelPlan = await generateTravelPlan(data);
          await redis.set(`result:${jobId}`, JSON.stringify(travelPlan), 'EX', 3600);
        } catch (err) {
          console.error('[In-Memory Queue] Execution error:', err);
        }
      }, 500);
      return { id: jobId };
    },
  };

  dlq1 = { add: async () => ({ id: 'dlq1-' + Date.now() }) };
  dlq2 = { add: async () => ({ id: 'dlq2-' + Date.now() }) };
  worker = dummyWorker;
  dlq1Worker = dummyWorker;
  dlq2Worker = dummyWorker;
  queueRedis = { quit: async () => {} };
} else {
  // ── Real BullMQ Queue Connection ─────────────────────────────────────────
  queueRedis = new Redis({
    host: process.env.REDIS_HOST!,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    username: process.env.REDIS_USERNAME || 'default',
    maxRetriesPerRequest: null,
    lazyConnect: true,
    enableOfflineQueue: false,
    connectTimeout: 5000,
    retryStrategy: () => null,
  });

  queueRedis.on('error', (err: Error) => {
    console.warn('[BullMQ Redis] Connection error:', err.message);
  });

  travelPlanQueue = new Queue('travel-plan-queue', {
    connection: queueRedis,
    defaultJobOptions: { removeOnComplete: 100, removeOnFail: 50 },
  });

  dlq1 = new Queue('travel-plan-dlq1', {
    connection: queueRedis,
    defaultJobOptions: { removeOnComplete: 100, removeOnFail: 50, delay: 5000 },
  });

  dlq2 = new Queue('travel-plan-dlq2', {
    connection: queueRedis,
    defaultJobOptions: { removeOnComplete: 100, removeOnFail: 50, delay: 10000 },
  });

  worker = new Worker(
    'travel-plan-queue',
    async (job) => {
      console.log(`[Worker] Processing job ${job.id} with data:`, job.data);
      const travelPlan = await generateTravelPlan(job.data as TravelDetails);
      await redis.set(`result:${job.id}`, JSON.stringify(travelPlan), 'EX', 3600);
      return travelPlan;
    },
    { connection: queueRedis, concurrency: 2 },
  );

  dlq1Worker = new Worker(
    'travel-plan-dlq1',
    async (job) => {
      console.log(`[DLQ1 Worker] Retrying job ${job.id}`);
      const travelPlan = await generateTravelPlan(job.data as TravelDetails);
      await redis.set(`result:${job.id}`, JSON.stringify(travelPlan), 'EX', 3600);
      return travelPlan;
    },
    { connection: queueRedis, concurrency: 1 },
  );

  dlq2Worker = new Worker(
    'travel-plan-dlq2',
    async (job) => {
      console.log(`[DLQ2 Worker] Final retry for job ${job.id}`);
      const travelPlan = await generateTravelPlan(job.data as TravelDetails);
      await redis.set(`result:${job.id}`, JSON.stringify(travelPlan), 'EX', 3600);
      return travelPlan;
    },
    { connection: queueRedis, concurrency: 1 },
  );

  // Attach error handlers to prevent unhandled promise rejections
  for (const w of [worker, dlq1Worker, dlq2Worker]) {
    w.on('failed', (job: any, err: Error) => {
      console.error(`[Worker] Job ${job?.id} failed:`, err.message);
    });
    w.on('error', (err: Error) => {
      console.error('[Worker] Worker error:', err.message);
    });
  }
}

export { travelPlanQueue, dlq1, dlq2, worker, dlq1Worker, dlq2Worker, queueRedis };
