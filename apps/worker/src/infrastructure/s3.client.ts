import dotenv from "dotenv";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

dotenv.config();

/**
 * Validate required environment variables
 */
if (!process.env.S3_ENDPOINT) {
  throw new Error("S3_ENDPOINT missing in worker .env");
}

if (!process.env.S3_ACCESS_KEY) {
  throw new Error("S3_ACCESS_KEY missing in worker .env");
}

if (!process.env.S3_SECRET_KEY) {
  throw new Error("S3_SECRET_KEY missing in worker .env");
}

if (!process.env.S3_BUCKET_NAME) {
  throw new Error("S3_BUCKET_NAME missing in worker .env");
}

/**
 * Bucket name from environment
 */
export const BUCKET_NAME = process.env.S3_BUCKET_NAME;

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
 * Download file from S3 / MinIO
 */
export async function downloadFile(
  bucket: string,
  key: string
): Promise<Buffer> {
  const response = await s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );

  return streamToBuffer(response.Body as Readable);
}

/**
 * Convert stream to buffer
 */
function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: any[] = [];

    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}