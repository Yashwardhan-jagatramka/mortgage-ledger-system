import dotenv from "dotenv";
import { Redis } from "ioredis";

dotenv.config();

/**
 * Ensure REDIS_URL exists
 */
if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL is not defined in environment variables");
}

/**
 * Create Redis client using URL instead of hardcoded host/port
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
  console.log("✅ Redis connected");
});

redis.on("error", (err) => {
  console.error("❌ Redis error:", err.message);
});

/**
 * Redis Stream key for document processing
 */
export const STREAM_KEY = "document:process";