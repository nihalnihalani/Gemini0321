import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { createReadStream } from "fs";
import { copyFile, mkdir } from "fs/promises";
import path from "path";

const CONTENT_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webm": "video/webm",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

const LOCAL_ASSET_ROOT = "/tmp/gemini-video-gen-assets";

function getLocalStorageKey(localPath: string, key: string): string {
  const sourceExt = path.extname(localPath).toLowerCase();
  const targetExt = path.extname(key).toLowerCase();

  if (sourceExt && targetExt && sourceExt !== targetExt) {
    return `${key.slice(0, -targetExt.length)}${sourceExt}`;
  }

  return key;
}

let s3Client: S3Client | null = null;

function getAppBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function isS3Configured(): boolean {
  return Boolean(
    process.env.S3_ENDPOINT &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY &&
      process.env.S3_BUCKET_NAME &&
      process.env.S3_PUBLIC_URL
  );
}

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getBucketName(): string {
  return getEnvVar("S3_BUCKET_NAME");
}

function getPublicBaseUrl(): string {
  return getEnvVar("S3_PUBLIC_URL");
}

export function getPublicUrl(key: string): string {
  if (!isS3Configured()) {
    return `${getAppBaseUrl()}/api/assets/${key}`;
  }
  return `${getPublicBaseUrl()}/${key}`;
}

export function getLocalAssetPath(key: string): string {
  return path.join(LOCAL_ASSET_ROOT, key);
}

export function generateKey(jobId: string, filename: string): string {
  return `jobs/${jobId}/${filename}`;
}

export async function uploadFile(
  localPath: string,
  key: string
): Promise<string> {
  if (!isS3Configured()) {
    const localKey = getLocalStorageKey(localPath, key);
    const outputPath = getLocalAssetPath(localKey);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await copyFile(localPath, outputPath);
    return getPublicUrl(localKey);
  }

  const ext = path.extname(localPath).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
  const upload = new Upload({
    client: getS3Client(),
    params: {
      Bucket: getBucketName(),
      Key: key,
      Body: createReadStream(localPath),
      ContentType: contentType,
    },
  });

  await upload.done();

  return getPublicUrl(key);
}

export async function deleteFile(key: string): Promise<void> {
  if (!isS3Configured()) {
    return;
  }

  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    })
  );
}
