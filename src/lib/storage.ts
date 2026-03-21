import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { createReadStream } from "fs";
import path from "path";

const CONTENT_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".wav": "audio/wav",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webm": "video/webm",
  ".gif": "image/gif",
};

let s3Client: S3Client | null = null;

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: getEnvVar("S3_ENDPOINT"),
      credentials: {
        accessKeyId: getEnvVar("S3_ACCESS_KEY_ID"),
        secretAccessKey: getEnvVar("S3_SECRET_ACCESS_KEY"),
      },
      region: "auto",
      forcePathStyle: true,
    });
  }
  return s3Client;
}

function getBucketName(): string {
  return getEnvVar("S3_BUCKET_NAME");
}

function getPublicBaseUrl(): string {
  return getEnvVar("S3_PUBLIC_URL");
}

export function getPublicUrl(key: string): string {
  return `${getPublicBaseUrl()}/${key}`;
}

export function generateKey(jobId: string, filename: string): string {
  return `jobs/${jobId}/${filename}`;
}

export async function uploadFile(
  localPath: string,
  key: string
): Promise<string> {
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
  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    })
  );
}
