import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { Readable } from "stream";
import { NextResponse } from "next/server";
import { getLocalAssetPath } from "@/lib/storage";

const CONTENT_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".wav": "audio/wav",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webm": "video/webm",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

function getContentType(filePath: string): string {
  return CONTENT_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

function isWithinRoot(filePath: string): boolean {
  return filePath.startsWith("/tmp/gemini-video-gen-assets/");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;
  const assetPath = getLocalAssetPath(key.join("/"));

  if (!isWithinRoot(assetPath)) {
    return NextResponse.json({ error: "Invalid asset path" }, { status: 400 });
  }

  let fileStat;
  try {
    fileStat = await stat(assetPath);
  } catch {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  const contentType = getContentType(assetPath);
  const range = request.headers.get("range");

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (!match) {
      return NextResponse.json({ error: "Invalid range" }, { status: 416 });
    }

    const start = match[1] ? Number.parseInt(match[1], 10) : 0;
    const end = match[2] ? Number.parseInt(match[2], 10) : fileStat.size - 1;

    if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= fileStat.size) {
      return NextResponse.json({ error: "Invalid range" }, { status: 416 });
    }

    const stream = createReadStream(assetPath, { start, end });
    return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(end - start + 1),
        "Accept-Ranges": "bytes",
        "Content-Range": `bytes ${start}-${end}/${fileStat.size}`,
        "Cache-Control": "no-cache",
      },
    });
  }

  const stream = createReadStream(assetPath);
  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(fileStat.size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "no-cache",
    },
  });
}
