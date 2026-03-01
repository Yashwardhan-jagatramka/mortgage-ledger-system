import express from "express";
import documentRoutes from "./routes/document.routes.js";
import authRoutes from "./routes/auth.routes.js";
import cors from "cors";

export function createServer() {
  const app = express();

  app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
  }));
  app.use(express.json());
  app.use("/auth", authRoutes);
  app.use("/documents", documentRoutes);

  return app;
}