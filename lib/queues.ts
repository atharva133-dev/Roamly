import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { config } from 'dotenv';
import redis from './redis';

// Load environment variables
config();

interface TravelDetails {
  destinations: string[];
  start_date: string;
  end_date: string;
  budget: string;
  travel_style: string;
  interests: string[];
  accommodation: string;
  transportation: string;
  special_requests: string;
  requestKey?: string;
  inputHash?: string;
}

const isRedisDisabled = process.env.REDIS_ENABLED === 'false' || !process.env.REDIS_HOST || process.env.REDIS_HOST === 'none';

let travelPlanQueue: any;
let dlq1: any;
let dlq2: any;
let worker: any;
let dlq1Worker: any;
let dlq2Worker: any;
let queueRedis: any;

// Actual LLM function for generating travel plan
async function generateTravelPlan(data: TravelDetails) {
  const { destinations, start_date, end_date, budget, travel_style, interests, accommodation, transportation, special_requests } = data;
  
  // Calculate duration from dates
  const startDate = new Date(start_date);
  const endDate = new Date(end_date);
  const duration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  // Call the actual LLM API
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/generatePlanWithSummary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`LLM API failed: ${response.status}`);
    }

    const result = await response.json();
    return result.plan;
  } catch (error) {
    console.error('Error calling LLM API (using structured fallback):', error);
    
    // Fallback to structured data if LLM fails
    const itinerary = [];
    for (let i = 1; i <= duration; i++) {
      const cityIndex = (i - 1) % destinations.length;
      const city = destinations[cityIndex];
      
      itinerary.push({
        day: `Day ${i}`,
        city: city,
        morning: `Explore ${city} - Morning activities based on ${travel_style} interests`,
        afternoon: `Continue exploring ${city} - Afternoon activities`,
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
        'Check local weather before departure',
        'Learn basic local phrases',
        `Focus on ${travel_style.toLowerCase()} experiences`,
        `Budget-friendly options for ${budget.toLowerCase()} travel`,
      ],
      packing_list: [
        'Passport and travel documents',
        'Comfortable clothing',
        'Travel adapter',
        'First aid kit',
        'Camera for capturing memories',
      ],
      emergency_contacts: {
        local_emergency: '112',
        embassy: 'Check local embassy information',
        hotel: 'Hotel contact details',
      },
    };
  }
}

if (isRedisDisabled) {
  // In-Memory Queue Fallback
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
    }
  };

  dlq1 = { add: async () => ({ id: 'dlq1-' + Date.now() }) };
  dlq2 = { add: async () => ({ id: 'dlq2-' + Date.now() }) };
  worker = dummyWorker;
  dlq1Worker = dummyWorker;
  dlq2Worker = dummyWorker;
  queueRedis = { quit: async () => {} };
} else {
  // Real BullMQ Queue Connection
  queueRedis = new Redis({
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    username: process.env.REDIS_USERNAME || 'default',
    maxRetriesPerRequest: null,
    lazyConnect: true,
    enableOfflineQueue: false,
    connectTimeout: 5000,
    retryStrategy: () => null,
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

  worker = new Worker('travel-plan-queue', async (job) => {
    console.log(`Processing job ${job.id} with data:`, job.data);
    const travelPlan = await generateTravelPlan(job.data);
    await redis.set(`result:${job.id}`, JSON.stringify(travelPlan), 'EX', 3600);
    return travelPlan;
  }, { connection: queueRedis, concurrency: 2 });

  dlq1Worker = new Worker('travel-plan-dlq1', async (job) => {
    const travelPlan = await generateTravelPlan(job.data);
    await redis.set(`result:${job.id}`, JSON.stringify(travelPlan), 'EX', 3600);
    return travelPlan;
  }, { connection: queueRedis, concurrency: 1 });

  dlq2Worker = new Worker('travel-plan-dlq2', async (job) => {
    const travelPlan = await generateTravelPlan(job.data);
    await redis.set(`result:${job.id}`, JSON.stringify(travelPlan), 'EX', 3600);
    return travelPlan;
  }, { connection: queueRedis, concurrency: 1 });
}

export { travelPlanQueue, dlq1, dlq2, worker, dlq1Worker, dlq2Worker };
