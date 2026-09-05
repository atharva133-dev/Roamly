import Redis from 'ioredis';
import { config } from 'dotenv';
import { EventEmitter } from 'events';

// Load environment variables first
config();

// In-Memory cache fallback when Redis is not installed / running
class InMemoryRedis extends EventEmitter {
  private cache = new Map<string, { value: string; expiresAt?: number }>();
  public status = 'ready';

  constructor() {
    super();
    console.log('📦 Using In-Memory Cache (Redis is not installed, operating in zero-dependency mode)');
  }

  async get(key: string): Promise<string | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    if (item.expiresAt && item.expiresAt < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<'OK'> {
    let expiresAt: number | undefined;
    if (mode === 'EX' && typeof duration === 'number') {
      expiresAt = Date.now() + duration * 1000;
    }
    this.cache.set(key, { value, expiresAt });
    return 'OK';
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    return this.set(key, value, 'EX', seconds);
  }

  async del(key: string): Promise<number> {
    return this.cache.delete(key) ? 1 : 0;
  }

  async ping(): Promise<string> {
    return 'PONG (in-memory)';
  }

  async quit(): Promise<'OK'> {
    return 'OK';
  }

  async disconnect(): Promise<void> {}
}

const isRedisDisabled = process.env.REDIS_ENABLED === 'false' || !process.env.REDIS_HOST || process.env.REDIS_HOST === 'none';

let redisInstance: any;

if (isRedisDisabled) {
  redisInstance = new InMemoryRedis();
} else {
  try {
    const redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      username: process.env.REDIS_USERNAME || undefined,
      maxRetriesPerRequest: null,
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: 2000,
      retryStrategy: () => null, // Do not spam retries if connection is refused
    });

    redis.on('connect', () => {
      console.log('✅ Redis connected successfully');
    });

    redis.on('error', (err) => {
      console.warn('⚠️  Redis unavailable, fallback in effect:', err.message);
    });

    redisInstance = redis;
  } catch {
    redisInstance = new InMemoryRedis();
  }
}

export default redisInstance;
