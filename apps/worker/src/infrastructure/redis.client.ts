import dotenv from "dotenv";
import { Redis } from "ioredis";

dotenv.config();

/**
 * Ensure REDIS_URL exists
 */
if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not defined in worker environment variables");
}

/**
 * Create Redis client using URL
 * Example:
 * REDIS_URL=redis://127.0.0.1:6379
 */
export const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    return Math.min(times * 100, 2000);
  },
});

redis.on("connect", () => {
  console.log("✅ Worker Redis connected");
});

redis.on("error", (err) => {
  console.error("❌ Worker Redis error:", err.message);
});

/**
 * Redis Stream configuration
 */
export const STREAM_KEY = "document:process";
export const GROUP_NAME = "worker-group";
export const CONSUMER_NAME = "worker-1";