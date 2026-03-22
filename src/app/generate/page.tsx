"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import type { JobStatus, CompositionStyle } from "@/lib/types";
import { DEFAULT_STYLE } from "@/lib/types";
import GenerationProgress from "@/components/GenerationProgress";
import EditPanel from "@/components/EditPanel";
import LiveChat from "@/components/LiveChat";
import Navbar from "@/components/Navbar";
import LoadingSkeleton from "@/components/LoadingSkeleton";

const VideoPreview = dynamic(() => import("@/components/VideoPreview"), {
  ssr: false,
});

function GenerateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const jobId = searchParams.get("jobId");
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compositionStyle, setCompositionStyle] =
    useState<CompositionStyle>(DEFAULT_STYLE);

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

  const handleStyleChange = (style: CompositionStyle, _explanation: string) => {
    setCompositionStyle(style);
  };

  if (!jobId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <p style={{ color: "var(--outline)" }}>No job ID provided.</p>
        <button
          onClick={() => router.push("/")}
          className="btn-ghost mt-4 text-sm"
        >
          Go Home
        </button>
      </div>
    );
  }

  // Completed state with edit UI
  if (status?.stage === "completed" && status.generatedScript) {
    return (
      <div className="flex min-h-screen flex-col animate-fade-in">
        <Navbar />

        <div className="flex flex-1 flex-col px-4 py-6 sm:px-8">
          {/* Video title and status */}
          <div className="mb-6">
            <h1
              className="text-headline-md mb-2"
              style={{ fontFamily: "var(--font-serif, Georgia, serif)" }}
            >
              {status.generatedScript.title}
            </h1>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
              style={{
                background: "rgba(125, 220, 142, 0.1)",
                color: "#7ddc8e",
                border: "1px solid rgba(125, 220, 142, 0.2)",
              }}
            >
              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Generated
            </span>
          </div>

          <div className="flex flex-1 flex-col gap-8 lg:flex-row">
            {/* Left: Video Preview */}
            <div className="flex-1 lg:flex-[2]">
              <VideoPreview
                script={status.generatedScript}
                style={compositionStyle}
              />
              {status.downloadUrl && (
                <div className="mt-6">
                  <a
                    href={status.downloadUrl}
                    className="btn-primary inline-flex items-center gap-2 text-sm"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3"
                      />
                    </svg>
                    Download Video
                  </a>
                </div>
              )}
            </div>

          {/* Right: Edit Panel + Live Chat */}
          <div className="flex flex-col gap-6 lg:flex-1">
            <div className="min-h-[300px] lg:h-[350px]">
              <EditPanel
                currentStyle={compositionStyle}
                onStyleChange={handleStyleChange}
              />
            </div>
            <div className="h-[300px] lg:h-[350px]">
              <LiveChat />
            </div>
          </div>
          </div>
        </div>
      </div>
    );
  }

  // In-progress / error / loading states
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <button
        onClick={() => router.push("/")}
        className="btn-ghost absolute left-4 top-4 flex items-center gap-2 px-3 py-1.5 text-sm sm:left-8 sm:top-8"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back
      </button>

      <h1 className="text-headline-lg mb-2">Generating Your Video</h1>
      <p className="text-label-md mb-8">Job: {jobId}</p>

      {error && !status && (
        <div
          className="w-full max-w-2xl rounded-lg px-4 py-3 text-sm"
          style={{
            background: "rgba(147, 0, 10, 0.15)",
            border: "1px solid rgba(255, 180, 171, 0.2)",
            color: "var(--error)",
          }}
        >
          {error}
        </div>
      )}

      {status && <GenerationProgress status={status} />}

      {status?.stage === "failed" && (
        <button
          onClick={() => router.push("/")}
          className="btn-primary mt-6 text-sm"
        >
          Try Again
        </button>
      )}

      {!status && !error && (
        <div className="w-full max-w-2xl space-y-6 animate-fade-in">
          {/* Skeleton stepper */}
          <div className="flex items-center justify-between gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-1 items-center">
                <div className="skeleton h-9 w-9 rounded-full flex-shrink-0" />
                {i < 5 && <div className="skeleton mx-1 h-[2px] flex-1" />}
              </div>
            ))}
          </div>
          {/* Skeleton content bars */}
          <LoadingSkeleton lines={3} className="mt-4" />
          {/* Skeleton scene cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton skeleton-rect h-20 w-full" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          <div className="w-full max-w-2xl space-y-6">
            <div className="skeleton skeleton-heading mx-auto" />
            <div className="skeleton skeleton-text mx-auto w-24" />
            <div className="skeleton h-1.5 w-full rounded-full" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton skeleton-rect h-20 w-full" />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <GenerateContent />
    </Suspense>
  );
}
