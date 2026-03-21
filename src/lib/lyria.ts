import { mkdir, access, writeFile, readdir } from "fs/promises";
import path from "path";

export interface MusicConfig {
  durationSeconds: number;
  genre?: string;
  mood?: string;
  tempo?: "slow" | "medium" | "fast";
}

const LYRIA_DIR = "/tmp/lyria";

async function ensureLyriaDir(): Promise<void> {
  try {
    await access(LYRIA_DIR);
  } catch {
    await mkdir(LYRIA_DIR, { recursive: true });
  }
}

export async function generateMusic(
  prompt: string,
  config: MusicConfig
): Promise<string> {
  try {
    return await generateWithLyria(prompt, config);
  } catch (err) {
    console.warn(
      `Lyria generation failed: ${err instanceof Error ? err.message : err}. Falling back to placeholder.`
    );
    return await getPlaceholderMusic(config);
  }
}

export async function generateWithLyria(
  prompt: string,
  config: MusicConfig
): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set — cannot use Lyria API");
  }

  // Lyria RealTime API is WebSocket-based and experimental (v1alpha).
  // This stub allows us to swap in real Lyria support later without
  // changing the interface.
  throw new Error(
    "Lyria RealTime API not yet implemented \u2014 using fallback"
  );
}

export async function getPlaceholderMusic(
  config: MusicConfig
): Promise<string> {
  await ensureLyriaDir();

  const sampleRate = 48000;
  const numChannels = 2;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = Math.ceil(config.durationSeconds) * byteRate;
  const headerSize = 44;

  const buffer = Buffer.alloc(headerSize + dataSize);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(headerSize + dataSize - 8, 4);
  buffer.write("WAVE", 8);

  // fmt sub-chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // sub-chunk size
  buffer.writeUInt16LE(1, 20); // PCM format
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk (all zeros = silence)
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  const outputPath = path.join(LYRIA_DIR, `placeholder-${Date.now()}.wav`);
  await writeFile(outputPath, buffer);

  console.warn(
    "Using silent placeholder audio \u2014 configure Lyria API or add royalty-free music to public/music/"
  );

  return outputPath;
}

export async function getMusicFromLibrary(
  musicDir: string,
  mood?: string
): Promise<string | null> {
  try {
    await access(musicDir);
  } catch {
    return null;
  }

  let files: string[];
  try {
    const entries = await readdir(musicDir);
    files = entries.filter(
      (f) =>
        f.toLowerCase().endsWith(".mp3") || f.toLowerCase().endsWith(".wav")
    );
  } catch {
    return null;
  }

  if (files.length === 0) {
    return null;
  }

  if (mood) {
    const moodLower = mood.toLowerCase();
    const matching = files.filter((f) =>
      f.toLowerCase().includes(moodLower)
    );
    if (matching.length > 0) {
      return path.join(musicDir, matching[Math.floor(Math.random() * matching.length)]);
    }
  }

  return path.join(musicDir, files[Math.floor(Math.random() * files.length)]);
}
