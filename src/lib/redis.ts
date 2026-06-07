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
      console.warn("Redis connectivity lost. Running in bypass/memory-cache mode.", err.message);
    });
    
    redis.on("connect", () => {
      console.log("Redis connected successfully.");
    });
  } catch (err) {
    console.error("Failed to initialize Redis client:", err);
  }
} else {
  console.log("REDIS_URL not configured. Running in memory-cache fallback mode.");
}

// In-Memory cache fallback structure
interface CacheEntry {
  value: string;
  expires: number;
}
const memoryCache = new Map<string, CacheEntry>();

/**
 * Retrieve item from cache (Redis or in-memory fallback)
 */
export async function getCache(key: string): Promise<string | null> {
  if (redis) {
    try {
      return await redis.get(key);
    } catch (err) {
      console.error("Redis get error:", err);
    }
  }
  
  // Memory cache fallback
  const cached = memoryCache.get(key);
  if (cached) {
    if (Date.now() < cached.expires) {
      return cached.value;
    }
    // Clean up expired cache
    memoryCache.delete(key);
  }
  return null;
}

/**
 * Save item in cache with a TTL (default 10 minutes / 600s)
 */
export async function setCache(key: string, value: string, ttlSeconds = 600): Promise<void> {
  if (redis) {
    try {
      await redis.set(key, value, "EX", ttlSeconds);
      return;
    } catch (err) {
      console.error("Redis set error:", err);
    }
  }
  
  // Memory cache fallback
  memoryCache.set(key, {
    value,
    expires: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Invalidate cache key or pattern matching a wildcard
 */
export async function invalidateCache(pattern: string): Promise<void> {
  if (redis) {
    try {
      if (pattern.includes("*")) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(...keys);
          console.log(`Invalidated keys matching pattern '${pattern}' on Redis:`, keys);
        }
      } else {
        await redis.del(pattern);
        console.log(`Invalidated cache key '${pattern}' on Redis`);
      }
      return;
    } catch (err) {
      console.error("Redis delete error:", err);
    }
  }
  
  // Memory cache fallback
  if (pattern.includes("*")) {
    // Convert Redis wildcard '*' to regex (e.g. products:list:* -> products:list:.*)
    const escapedPattern = pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&").replace(/\\\*/g, ".*");
    const regex = new RegExp(`^${escapedPattern}$`);
    
    let deletedCount = 0;
    memoryCache.forEach((_, key) => {
      if (regex.test(key)) {
        memoryCache.delete(key);
        deletedCount++;
      }
    });
    console.log(`Invalidated ${deletedCount} keys matching pattern '${pattern}' in Memory Cache.`);
  } else {
    memoryCache.delete(pattern);
    console.log(`Invalidated cache key '${pattern}' in Memory Cache.`);
  }
}

/**
 * Flush all cached entries
 */
export async function clearAllCache(): Promise<void> {
  if (redis) {
    try {
      await redis.flushdb();
      console.log("All cache flushed successfully on Redis.");
      return;
    } catch (err) {
      console.error("Redis flush error:", err);
    }
  }
  
  memoryCache.clear();
  console.log("All in-memory cache flushed successfully.");
}
