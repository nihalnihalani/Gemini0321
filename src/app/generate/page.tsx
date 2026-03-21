"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import type { JobStatus } from "@/lib/types";
import GenerationProgress from "@/components/GenerationProgress";

function GenerateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const jobId = searchParams.get("jobId");
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!jobId) return;
    try {
      const res = await fetch(`/api/status/${jobId}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch status (${res.status})`);
      }
      const data: JobStatus = await res.json();
      setStatus(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch status");
      return null;
    }
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;

    fetchStatus();

    const interval = setInterval(async () => {
      const data = await fetchStatus();
      if (data && (data.stage === "completed" || data.stage === "failed")) {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, fetchStatus]);

  if (!jobId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <p className="text-gray-400">No job ID provided.</p>
        <button
          onClick={() => router.push("/")}
          className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/20"
        >
          Go Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <button
        onClick={() => router.push("/")}
        className="absolute left-4 top-4 rounded-lg bg-white/5 px-3 py-1.5 text-sm text-gray-400 transition hover:bg-white/10 hover:text-white sm:left-8 sm:top-8"
      >
        &larr; Back
      </button>

      <h1 className="mb-2 text-2xl font-bold text-white">Generating Video</h1>
      <p className="mb-8 text-sm text-gray-500">Job: {jobId}</p>

      {error && !status && (
        <div className="w-full max-w-2xl rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {status && <GenerationProgress status={status} />}

      {status?.stage === "failed" && (
        <button
          onClick={() => router.push("/")}
          className="mt-6 rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-6 py-3 font-medium text-white transition hover:from-blue-600 hover:to-violet-600"
        >
          Try Again
        </button>
      )}

      {!status && !error && (
        <div className="flex items-center gap-2 text-gray-400">
          <svg
            className="h-5 w-5 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Loading status...
        </div>
      )}
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-gray-400">
          Loading...
        </div>
      }
    >
      <GenerateContent />
    </Suspense>
  );
}
