# Redis + BullMQ Queuing System for Roamly

This document explains how to set up and use the new queuing system that replaces the direct API calls with a job-based approach.

## Architecture Overview

The system consists of:

1. **Redis Cache**: Stores completed results keyed by input hash and job ID
2. **Main Queue**: Processes travel plan generation jobs
3. **Dead Letter Queues (DLQs)**: Handle retries for failed jobs
   - DLQ1: First retry with 5-second delay
   - DLQ2: Second retry with 10-second delay
4. **API Routes**: 
   - `/api/submitJob`: Submit new jobs and check cache
   - `/api/getResult`: Poll for completed results

## Setup Instructions

### 1. Install Redis

Make sure Redis is running on your system:

```bash
# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis-server

# macOS
brew install redis
brew services start redis

# Or use Docker
docker run -d -p 6379:6379 redis:alpine
```

### 2. Environment Variables

Add these to your `.env.local` file:

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Leave empty if no password
```

### 3. Start the Workers

In a separate terminal, start the BullMQ workers:

```bash
npm run workers
```

This will start:
- Main queue worker (concurrency: 2)
- DLQ1 worker (concurrency: 1) 
- DLQ2 worker (concurrency: 1)

### 4. Start the Next.js App

In another terminal:

```bash
npm run dev
```

## How It Works

### Job Submission Flow

1. User submits travel details via the LLM page
2. Frontend calls `/api/submitJob` with the travel data
3. API checks Redis cache for existing results
4. If found, returns immediately
5. If not found, enqueues job in main queue
6. Returns unique job key to frontend

### Job Processing Flow

1. Worker picks up job from main queue
2. Simulates LLM processing (2-second delay)
3. Generates travel plan using placeholder logic
4. Stores result in Redis cache
5. If job fails, moves to DLQ1 for retry
6. If DLQ1 fails, moves to DLQ2 for final retry
7. After final failure, job is discarded

### Result Retrieval Flow

1. Frontend polls `/api/getResult` every 2 seconds
2. API checks Redis cache for the job key
3. If result is ready, returns it and stops polling
4. If not ready, returns 404 (frontend continues polling)

## API Endpoints

### POST /api/submitJob

Submit a new travel plan generation job.

**Request Body:**
```json
{
  "destination": "Paris, France",
  "duration": 4,
  "budget": "Mid-range",
  "travel_style": "Cultural",
  "interests": ["Museums", "Food", "Nature"],
  "accommodation": "Mid-range Hotel",
  "transportation": "Public Transport",
  "special_requests": "None"
}
```

**Response:**
```json
{
  "key": "uuid-here",
  "status": "queued|completed",
  "message": "Job submitted successfully",
  "result": {} // Only if status is "completed"
}
```

### GET /api/getResult?key={jobKey}

Poll for job results.

**Response (Success):**
```json
{
  "key": "uuid-here",
  "result": {
    "itinerary": [...],
    "total_estimated_cost": "$500",
    "travel_tips": [...],
    "packing_list": [...],
    "emergency_contacts": {...}
  },
  "status": "completed",
  "message": "Result retrieved successfully"
}
```

**Response (Not Ready):**
```json
{
  "error": "Result not found"
}
```
Status: 404

## Frontend Integration

The LLM page has been updated to:

1. Submit jobs instead of direct API calls
2. Poll for results every 2 seconds
3. Show job status (queued, processing, completed, failed)
4. Handle caching automatically

## Monitoring and Debugging

### Worker Logs

The workers log all job processing activities:

```bash
npm run workers
```

Look for:
- Job processing messages
- Failure and retry messages
- Queue movement between DLQs

### Redis Commands

Monitor Redis activity:

```bash
redis-cli
> MONITOR  # Watch all Redis commands
> KEYS *   # List all keys
> GET result:{jobId}  # Get specific result
```

### Queue Status

Check queue status in Redis:

```bash
redis-cli
> LLEN bull:travel-plan-queue:wait
> LLEN bull:travel-plan-dlq1:wait
> LLEN bull:travel-plan-dlq2:wait
```

## Customization

### Replace Placeholder LLM Logic

The `generateTravelPlan` function in `lib/queues.ts` is a placeholder. Replace it with your actual LLM integration:

```typescript
async function generateTravelPlan(data: TravelDetails) {
  // Call your LLM API here
  const response = await fetch('your-llm-endpoint', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  
  return await response.json();
}
```

### Adjust Retry Delays

Modify the delay values in the DLQ configurations:

```typescript
export const dlq1 = new Queue('travel-plan-dlq1', {
  connection: redis,
  defaultJobOptions: {
    delay: 5000, // 5 seconds
  },
});
```

### Change Polling Frequency

Update the polling interval in the frontend:

```typescript
const interval = setInterval(async () => {
  await pollForResult(data.key);
}, 2000); // 2 seconds
```

## Troubleshooting

### Common Issues

1. **Workers not starting**: Check Redis connection and ensure Redis is running
2. **Jobs stuck in queue**: Check worker logs for errors
3. **Results not being cached**: Verify Redis storage and expiration settings
4. **Frontend not polling**: Check browser console for API errors

### Performance Tuning

- Increase worker concurrency for higher throughput
- Adjust polling frequency based on expected job duration
- Set appropriate Redis expiration times for cache management
- Monitor queue lengths and adjust worker count accordingly

## Security Considerations

- Ensure Redis is not exposed to the internet
- Use Redis authentication if deployed in production
- Consider rate limiting for job submission
- Validate all input data before processing 