import express from "express";
import documentRoutes from "./routes/document.routes.js";
import authRoutes from "./routes/auth.routes.js";
import cors from "cors";

export function createServer() {
  const app = express();

  app.use(
    cors({
      origin: "http://localhost:3000",
      credentials: true,
    })
  );

  // 🔥 Increase body size limit
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  app.use("/auth", authRoutes);
  app.use("/documents", documentRoutes);

  return app;
}