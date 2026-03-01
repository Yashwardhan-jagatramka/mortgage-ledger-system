import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET_NAME } from "../infrastructure/s3.client.js";

export function extractKeyFromUrl(fileUrl: string): string {
  const parts = fileUrl.split("/");
  return parts[parts.length - 1];
}

export async function downloadFile(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const response = await s3.send(command);

  const stream = response.Body as any;

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks)));
  });
}