import { S3Client } from "@aws-sdk/client-s3";

export const s3 = new S3Client({
  region: "us-east-1",
  endpoint: "http://localhost:9000",
  forcePathStyle: true, // Required for MinIO
  credentials: {
    accessKeyId: "minio",
    secretAccessKey: "minio123",
  },
});

export const BUCKET_NAME = "documents";