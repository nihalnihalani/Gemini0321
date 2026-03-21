import { mkdir, access, writeFile, readdir } from "fs/promises";
import path from "path";
import { GoogleGenAI } from "@google/genai";

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

function tempoToBpm(tempo?: "slow" | "medium" | "fast"): number {
  switch (tempo) {
    case "slow":
      return 70;
    case "fast":
      return 130;
    case "medium":
    default:
      return 100;
  }
}

function writePcmToWav(
  pcmData: Buffer,
  outputPath: string,
  sampleRate: number,
  channels: number
): Buffer {
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = channels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmData.length;
  const headerSize = 44;

  const wavBuffer = Buffer.alloc(headerSize + dataSize);

  // RIFF header
  wavBuffer.write("RIFF", 0);
  wavBuffer.writeUInt32LE(headerSize + dataSize - 8, 4);
  wavBuffer.write("WAVE", 8);

  // fmt sub-chunk
  wavBuffer.write("fmt ", 12);
  wavBuffer.writeUInt32LE(16, 16); // sub-chunk size
  wavBuffer.writeUInt16LE(1, 20); // PCM format
  wavBuffer.writeUInt16LE(channels, 22);
  wavBuffer.writeUInt32LE(sampleRate, 24);
  wavBuffer.writeUInt32LE(byteRate, 28);
  wavBuffer.writeUInt16LE(blockAlign, 32);
  wavBuffer.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  wavBuffer.write("data", 36);
  wavBuffer.writeUInt32LE(dataSize, 40);

  // Copy PCM data after header
  pcmData.copy(wavBuffer, headerSize);

  return wavBuffer;
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

  await ensureLyriaDir();

  const client = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    apiVersion: "v1alpha",
  });

  const sampleRate = 44100;
  const channels = 2;
  const bytesPerSample = 2; // 16-bit
  const targetBytes = config.durationSeconds * sampleRate * channels * bytesPerSample;
  const timeoutMs = (config.durationSeconds + 10) * 1000;

  const chunks: Buffer[] = [];
  let totalBytes = 0;

  const audioPromise = new Promise<Buffer>((resolve, reject) => {
    let sessionRef: any = null;
    let settled = false;

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        if (sessionRef) {
          try { sessionRef.close(); } catch { /* ignore */ }
        }
        if (totalBytes > 0) {
          resolve(Buffer.concat(chunks));
        } else {
          reject(new Error("Lyria RealTime timed out with no audio data"));
        }
      }
    }, timeoutMs);

    client.live.music.connect({
      model: "models/lyria-realtime-exp",
      callbacks: {
        onmessage: (message: any) => {
          if (message.serverContent?.audioChunks) {
            for (const chunk of message.serverContent.audioChunks) {
              const buf = Buffer.from(chunk.data, "base64");
              chunks.push(buf);
              totalBytes += buf.length;

              if (totalBytes >= targetBytes && !settled) {
                settled = true;
                clearTimeout(timer);
                if (sessionRef) {
                  try { sessionRef.close(); } catch { /* ignore */ }
                }
                resolve(Buffer.concat(chunks));
              }
            }
          }
        },
        onerror: (error: any) => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        },
        onclose: () => {
          if (!settled) {
            settled = true;
            clearTimeout(timer);
            if (totalBytes > 0) {
              resolve(Buffer.concat(chunks));
            } else {
              reject(new Error("Lyria RealTime session closed with no audio data"));
            }
          }
        },
      },
    }).then(async (session: any) => {
      sessionRef = session;

      await session.setWeightedPrompts({
        weightedPrompts: [
          { text: prompt, weight: 1.0 },
        ],
      });

      await session.setMusicGenerationConfig({
        musicGenerationConfig: {
          bpm: tempoToBpm(config.tempo),
          temperature: 1.0,
          audioFormat: "pcm16",
          sampleRateHz: sampleRate,
        },
      });

      await session.play();
    }).catch((err: any) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });
  });

  const pcmData = await audioPromise;

  // Trim to exact target length if we got more data than needed
  const trimmed = pcmData.length > targetBytes
    ? pcmData.subarray(0, targetBytes)
    : pcmData;

  const wavBuffer = writePcmToWav(trimmed, "", sampleRate, channels);
  const outputPath = path.join(LYRIA_DIR, `music-${Date.now()}.wav`);
  await writeFile(outputPath, wavBuffer);

  return outputPath;
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
    "Using silent placeholder audio — configure Lyria API or add royalty-free music to public/music/"
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
