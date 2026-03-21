"use client";

import { useState } from "react";

interface PromptInputProps {
  onSubmit: (prompt: string, resolution: string, sceneCount: number) => void;
  isLoading: boolean;
}

export default function PromptInput({ onSubmit, isLoading }: PromptInputProps) {
  const [prompt, setPrompt] = useState("");
  const [resolution, setResolution] = useState("720p");
  const [sceneCount, setSceneCount] = useState(5);
  const [showSettings, setShowSettings] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    onSubmit(prompt.trim(), resolution, sceneCount);
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-4">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe the video you want to create..."
        disabled={isLoading}
        rows={5}
        className="w-full resize-none rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 outline-none transition focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
      />

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          className="text-sm text-gray-400 transition hover:text-gray-200"
        >
          {showSettings ? "Hide settings" : "Advanced settings"}
        </button>
      </div>

      {showSettings && (
        <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:gap-8">
          <div className="flex flex-col gap-1">
            <label htmlFor="resolution" className="text-sm text-gray-400">
              Resolution
            </label>
            <select
              id="resolution"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              disabled={isLoading}
              className="rounded-lg border border-white/10 bg-gray-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
            >
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
            </select>
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="sceneCount" className="text-sm text-gray-400">
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
              className="accent-blue-500"
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading || !prompt.trim()}
        className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-6 py-3 font-medium text-white transition hover:from-blue-600 hover:to-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
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
            Starting generation...
          </span>
        ) : (
          "Generate Video"
        )}
      </button>
    </form>
  );
}
