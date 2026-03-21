"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import PromptInput from "@/components/PromptInput";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(
    prompt: string,
    resolution: string,
    sceneCount: number
  ) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, resolution, sceneCount }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      router.push(`/generate?jobId=${data.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="mb-12 text-center">
        <h1 className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-6xl">
          AI Video Generator
        </h1>
        <p className="mx-auto mt-4 max-w-md text-lg text-gray-400">
          Transform your ideas into stunning videos with AI. Describe what you
          want, and we will generate it scene by scene.
        </p>
      </div>

      <PromptInput onSubmit={handleSubmit} isLoading={isLoading} />

      {error && (
        <div className="mt-4 w-full max-w-2xl rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="mt-16 grid max-w-2xl grid-cols-1 gap-6 text-center sm:grid-cols-3">
        <div>
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
            1
          </div>
          <h3 className="text-sm font-medium text-gray-300">Describe</h3>
          <p className="mt-1 text-xs text-gray-500">
            Write a prompt describing your video
          </p>
        </div>
        <div>
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
            2
          </div>
          <h3 className="text-sm font-medium text-gray-300">Generate</h3>
          <p className="mt-1 text-xs text-gray-500">
            AI creates a script and video clips
          </p>
        </div>
        <div>
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-400">
            3
          </div>
          <h3 className="text-sm font-medium text-gray-300">Download</h3>
          <p className="mt-1 text-xs text-gray-500">
            Get your composed video file
          </p>
        </div>
      </div>
    </div>
  );
}
