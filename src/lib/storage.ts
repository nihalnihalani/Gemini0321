import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { readFile } from "fs/promises";
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

let supabase: SupabaseClient | null = null;

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    supabase = createClient(
      getEnvVar("NEXT_PUBLIC_SUPABASE_URL"),
      getEnvVar("SUPABASE_SERVICE_ROLE_KEY")
    );
  }
  return supabase;
}

function getBucketName(): string {
  return process.env.SUPABASE_STORAGE_BUCKET || "video-assets";
}

export function getPublicUrl(key: string): string {
  const { data } = getSupabaseClient()
    .storage.from(getBucketName())
    .getPublicUrl(key);
  return data.publicUrl;
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

  const fileBuffer = await readFile(localPath);

  const { error } = await getSupabaseClient()
    .storage.from(getBucketName())
    .upload(key, fileBuffer, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  return getPublicUrl(key);
}

export async function deleteFile(key: string): Promise<void> {
  const { error } = await getSupabaseClient()
    .storage.from(getBucketName())
    .remove([key]);

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}
