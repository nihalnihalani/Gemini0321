"use client";

import { useState, useMemo } from "react";

type SourceType = "prompt" | "youtube" | "github";

interface DetectedSource {
  type: SourceType;
  url: string;
  label: string;
}

interface PromptInputProps {
  onSubmit: (prompt: string, resolution: string, sceneCount: number, source?: { type: SourceType; url: string }) => void;
  isLoading: boolean;
}

const YOUTUBE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/;
const GITHUB_REGEX = /(?:https?:\/\/)?(?:www\.)?github\.com\/([\w-]+)\/([\w.-]+)/;

function detectSource(text: string): DetectedSource | null {
  const ytMatch = text.match(YOUTUBE_REGEX);
  if (ytMatch) {
    return { type: "youtube", url: ytMatch[0], label: "YouTube Video" };
  }
  const ghMatch = text.match(GITHUB_REGEX);
  if (ghMatch) {
    return { type: "github", url: ghMatch[0], label: "GitHub Repo" };
  }
  return null;
}

export default function PromptInput({ onSubmit, isLoading }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const [resolution, setResolution] = useState("1080p");
  const [sceneCount, setSceneCount] = useState(5);

  const detectedSource = useMemo(() => detectSource(prompt), [prompt]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    onSubmit(
      prompt.trim(),
      resolution,
      sceneCount,
      detectedSource ? { type: detectedSource.type, url: detectedSource.url } : undefined
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5 font-sans">
      <div className="relative">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the video you want to create, or paste a YouTube/GitHub URL..."
          disabled={isLoading}
          rows={5}
          className="w-full resize-none rounded-xl bg-[#0e0e13] px-5 py-4 text-[var(--on-surface)] placeholder-[var(--outline)] outline-none border border-[var(--outline-variant)]/20 transition-all duration-250 focus:border-[#cdbdff] focus:shadow-[0_0_0_3px_rgba(92,31,222,0.15),0_0_20px_rgba(92,31,222,0.3)] disabled:opacity-50 text-base leading-relaxed"
        />
        {detectedSource && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-[var(--primary-container)]/20 border border-[var(--primary)]/30 px-2.5 py-1">
            <div className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
            <span className="text-[0.65rem] font-semibold text-[var(--primary)] uppercase tracking-wide">
              {detectedSource.label} detected
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="resolution"
            className="text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-[var(--outline)]"
          >
            Resolution
          </label>
          <select
            id="resolution"
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            disabled={isLoading}
            className="rounded-lg bg-[#1b1b20] px-3 py-2.5 text-sm text-[var(--on-surface)] outline-none border border-[var(--outline-variant)]/15 transition-colors focus:border-[#cdbdff] disabled:opacity-50 cursor-pointer"
          >
            <option value="720p">720p</option>
            <option value="1080p">1080p</option>
          </select>
        </div>

        <div className="flex flex-1 flex-col gap-1.5">
          <label
            htmlFor="sceneCount"
            className="text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-[var(--outline)]"
          >
            Scenes: {sceneCount}
          </label>
          <input
            id="sceneCount"
            type="range"
            min={3}
            max={8}
            value={sceneCount}
            onChange={(e) => setSceneCount(Number(e.target.value))}
            disabled={isLoading}
            aria-label={`Number of scenes: ${sceneCount}`}
            aria-valuemin={3}
            aria-valuemax={8}
            aria-valuenow={sceneCount}
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#1b1b20] accent-[#cdbdff] disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || !prompt.trim()}
          className="rounded-lg bg-gradient-to-r from-[#5c1fde] to-[#cdbdff] px-8 py-3 font-semibold text-white transition-all duration-250 hover:shadow-[0_0_20px_rgba(92,31,222,0.4)] hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none disabled:hover:translate-y-0 whitespace-nowrap"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
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
              Generating...
            </span>
          ) : (
            "Generate Video"
          )}
        </button>
      </div>
    </form>
  );
}
