import {
  redis,
  STREAM_KEY,
  GROUP_NAME,
  CONSUMER_NAME,
} from "../infrastructure/redis.client.js";

import { DocumentProcessor } from "../domain/document.processor.js";
import { logger } from "../infrastructure/logger.js";

export class StreamConsumer {
  private processor = new DocumentProcessor();

  async init() {
    try {
      await redis.xgroup("CREATE", STREAM_KEY, GROUP_NAME, "0", "MKSTREAM");
      logger.info("Consumer group created");
    } catch {
      logger.info("Consumer group already exists");
    }
  }

  async start() {
    await this.init();
    logger.info("Worker started...");

    while (true) {
      const response = (await redis.xreadgroup(
        "GROUP",
        GROUP_NAME,
        CONSUMER_NAME,
        "COUNT",
        1,
        "BLOCK",
        0,
        "STREAMS",
        STREAM_KEY,
        ">"
      )) as any;

      if (!response) continue;

      const [, messages] = response[0];

      for (const message of messages) {
        const [id, fields] = message;
        const documentId = fields[1];

        await this.processor.process(documentId);

        await redis.xack(STREAM_KEY, GROUP_NAME, id);
      }
    }
  }
}