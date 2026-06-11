import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";

const StorageConfigSchema = z.object({
  endpoint: z.string().url(),
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
  bucket: z.string(),
  region: z.string().default("auto"),
  publicUrl: z.string().url().optional(),
});

type StorageConfig = z.infer<typeof StorageConfigSchema>;

function makeClient(cfg: StorageConfig): S3Client {
  return new S3Client({
    endpoint: cfg.endpoint,
    region: cfg.region,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
    forcePathStyle: true,
  });
}

function resolveConfig(): StorageConfig | null {
  if (!process.env.R2_ENDPOINT) return null;
  return StorageConfigSchema.parse({
    endpoint: process.env.R2_ENDPOINT,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    bucket: process.env.R2_BUCKET ?? "wonderkit",
    region: process.env.R2_REGION ?? "auto",
    publicUrl: process.env.R2_PUBLIC_URL,
  });
}

/** Returns a pre-signed PUT URL valid for 15 minutes (or null if storage not configured). */
export async function getUploadUrl(key: string, contentType: string): Promise<string | null> {
  const cfg = resolveConfig();
  if (!cfg) return null;
  const client = makeClient(cfg);
  const cmd = new PutObjectCommand({ Bucket: cfg.bucket, Key: key, ContentType: contentType });
  return getSignedUrl(client, cmd, { expiresIn: 900 });
}

/** Returns a pre-signed GET URL valid for 1 hour (or the public URL if configured). */
export async function getDownloadUrl(key: string): Promise<string | null> {
  const cfg = resolveConfig();
  if (!cfg) return null;
  if (cfg.publicUrl) return `${cfg.publicUrl}/${key}`;
  const client = makeClient(cfg);
  const cmd = new GetObjectCommand({ Bucket: cfg.bucket, Key: key });
  return getSignedUrl(client, cmd, { expiresIn: 3600 });
}

/** Whether storage is configured in this environment. */
export function storageAvailable(): boolean {
  return Boolean(process.env.R2_ENDPOINT);
}
