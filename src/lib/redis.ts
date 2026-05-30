import Redis from "ioredis";

let redis: Redis | null = null;

if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      connectTimeout: 5000,
    });
    
    redis.on("error", (err) => {
      console.warn("Redis connectivity lost. Running in bypass mode.", err.message);
    });
    
    redis.on("connect", () => {
      console.log("Redis connected successfully.");
    });
  } catch (err) {
    console.error("Failed to initialize Redis client:", err);
  }
} else {
  console.log("REDIS_URL not configured. Running in cache-bypass mode.");
}

/**
 * Retrieve item from cache
 */
export async function getCache(key: string): Promise<string | null> {
  if (!redis) return null;
  try {
    return await redis.get(key);
  } catch (err) {
    console.error("Redis get error:", err);
    return null;
  }
}

/**
 * Save item in cache with a TTL (default 10 minutes / 600s)
 */
export async function setCache(key: string, value: string, ttlSeconds = 600): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, value, "EX", ttlSeconds);
  } catch (err) {
    console.error("Redis set error:", err);
  }
}

/**
 * Invalidate cache key or pattern matching a wildcard
 */
export async function invalidateCache(pattern: string): Promise<void> {
  if (!redis) return;
  try {
    if (pattern.includes("*")) {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`Invalidated keys matching pattern '${pattern}':`, keys);
      }
    } else {
      await redis.del(pattern);
      console.log(`Invalidated cache key '${pattern}'`);
    }
  } catch (err) {
    console.error("Redis delete error:", err);
  }
}

/**
 * Flush all cached entries
 */
export async function clearAllCache(): Promise<void> {
  if (!redis) return;
  try {
    await redis.flushdb();
    console.log("All cache flushed successfully.");
  } catch (err) {
    console.error("Redis flush error:", err);
  }
}
