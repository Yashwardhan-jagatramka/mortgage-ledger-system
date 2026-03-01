import dotenv from "dotenv";
import { S3Client } from "@aws-sdk/client-s3";

dotenv.config();

/**
 * Validate required environment variables
 */
if (!process.env.S3_ENDPOINT) {
  throw new Error("S3_ENDPOINT missing in .env");
}

if (!process.env.S3_ACCESS_KEY) {
  throw new Error("S3_ACCESS_KEY missing in .env");
}

if (!process.env.S3_SECRET_KEY) {
  throw new Error("S3_SECRET_KEY missing in .env");
}

if (!process.env.S3_BUCKET_NAME) {
  throw new Error("S3_BUCKET_NAME missing in .env");
}

/**
 * S3 Client configured for MinIO
 */
export const s3 = new S3Client({
  region: "us-east-1",
  endpoint: process.env.S3_ENDPOINT,
  forcePathStyle: true, // Required for MinIO
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
});

/**
 * Export bucket name from env
 */
export const BUCKET_NAME = process.env.S3_BUCKET_NAME;