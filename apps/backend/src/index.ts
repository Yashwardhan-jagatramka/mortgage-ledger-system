import dotenv from "dotenv";
dotenv.config();
import { createServer } from "./app/server.js";
import { logger } from "./infrastructure/logger.js";

const PORT = process.env.PORT || 4000;

const app = createServer();

app.listen(PORT, () => {
  logger.info(`Backend running on port ${PORT}`);
});