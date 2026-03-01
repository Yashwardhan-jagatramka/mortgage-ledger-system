import {Redis} from "ioredis";

export const redis = new Redis({
  host: "127.0.0.1", // 🔥 DO NOT use "localhost"
  port: 6379,
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

export const STREAM_KEY = "document:process";