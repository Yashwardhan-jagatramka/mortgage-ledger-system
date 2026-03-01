import dotenv from "dotenv";
dotenv.config();
import { StreamConsumer } from "./app/stream.consumer.js";
import { logger } from "./infrastructure/logger.js";

console.log("Gemini key loaded:", !!process.env.GEMINI_API_KEY);

async function bootstrap() {
  const consumer = new StreamConsumer();
  await consumer.start();
}

bootstrap().catch((err) => {
  logger.error(err);
  process.exit(1);
});