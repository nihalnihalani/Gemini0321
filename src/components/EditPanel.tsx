"use client";

import { useState, useRef, useEffect } from "react";
import type {
  CompositionStyle,
  EditHistoryEntry,
  EditResponse,
} from "@/lib/types";
import { DEFAULT_STYLE } from "@/lib/types";

interface EditPanelProps {
  currentStyle: CompositionStyle;
  onStyleChange: (style: CompositionStyle, explanation: string) => void;
}

export default function EditPanel({
  currentStyle,
  onStyleChange,
}: EditPanelProps) {
  const [instruction, setInstruction] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<EditHistoryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const historyEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const handleSubmit = async () => {
    if (!instruction.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, currentStyle }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      const data: EditResponse = await res.json();

      const entry: EditHistoryEntry = {
        instruction,
        style: data.style,
        explanation: data.explanation,
        timestamp: new Date().toISOString(),
      };

      setHistory((prev) => [...prev, entry]);
      onStyleChange(data.style, data.explanation);
      setInstruction("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const newHistory = history.slice(0, -1);
    setHistory(newHistory);
    const previousStyle =
      newHistory.length > 0 ? newHistory[newHistory.length - 1].style : DEFAULT_STYLE;
    onStyleChange(previousStyle, "Reverted to previous style");
  };

  const handleReset = () => {
    setHistory([]);
    onStyleChange(DEFAULT_STYLE, "Reset to default style");
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-gray-700/50 bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <h2 className="text-sm font-semibold text-white">Edit with AI</h2>
        <div className="flex gap-1.5">
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="rounded-lg bg-white/5 px-2.5 py-1 text-xs text-gray-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
          >
            Undo
          </button>
          <button
            onClick={handleReset}
            className="rounded-lg bg-white/5 px-2.5 py-1 text-xs text-gray-400 transition hover:bg-white/10 hover:text-white"
          >
            Reset
          </button>
        </div>
      </div>

      {/* History */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {history.length === 0 && (
          <div className="flex h-full items-center justify-center">
            <p className="text-center text-sm text-gray-600">
              Describe how you want to change the video style.
              <br />
              <span className="text-gray-700">
                e.g. &quot;Make the title bigger and blue&quot;
              </span>
            </p>
          </div>
        )}
        {history.map((entry, i) => (
          <div key={i} className="space-y-1.5">
            <div className="rounded-lg bg-blue-500/10 px-3 py-2 text-sm text-blue-300">
              {entry.instruction}
            </div>
            <div className="rounded-lg bg-gray-800/50 px-3 py-2 text-xs text-gray-400">
              {entry.explanation}
            </div>
          </div>
        ))}
        <div ref={historyEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-800 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Make the title bigger and blue..."
            disabled={isLoading}
            className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            onClick={handleSubmit}
            disabled={!instruction.trim() || isLoading}
            className="flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-violet-500 px-4 py-2 text-sm font-medium text-white transition hover:from-blue-600 hover:to-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <svg
                className="h-4 w-4 animate-spin"
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
            ) : (
              "Send"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
