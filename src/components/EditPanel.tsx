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

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="glass-card flex h-full flex-col animate-fade-in">
      {/* Header */}
      <div
        className="px-5 py-4"
        style={{ borderBottom: "1px solid rgba(73, 68, 86, 0.15)" }}
      >
        <h2 className="text-headline-md">Style Editor</h2>
      </div>

      {/* History */}
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {history.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <p
              className="text-center text-sm"
              style={{ color: "var(--outline)" }}
            >
              Describe how you&apos;d like to edit the video style
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {["Make title bigger", "Add dark overlay", "Hide subtitles", "Change font to serif"].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInstruction(suggestion)}
                  className="rounded-full px-3 py-1.5 text-xs transition-colors"
                  style={{
                    background: "rgba(205, 189, 255, 0.08)",
                    border: "1px solid rgba(205, 189, 255, 0.15)",
                    color: "var(--primary)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(205, 189, 255, 0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(205, 189, 255, 0.08)";
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        {history.map((entry, i) => (
          <div
            key={i}
            className="animate-fade-in space-y-2"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            {/* User bubble */}
            <span
              className="text-label-md block px-1 mb-1"
              style={{ fontSize: "0.5625rem", color: "var(--outline)", letterSpacing: "0.08em" }}
            >
              YOU
            </span>
            <div
              className="rounded-lg px-3.5 py-2.5 text-sm"
              style={{
                background: "var(--surface-container-high)",
                color: "var(--on-surface)",
              }}
            >
              {entry.instruction}
            </div>
            {/* AI explanation */}
            <span
              className="text-label-md block px-1 mt-2 mb-1"
              style={{ fontSize: "0.5625rem", color: "var(--outline)", letterSpacing: "0.08em" }}
            >
              AI
            </span>
            <p
              className="px-1 text-xs"
              style={{ color: "var(--on-surface-variant)" }}
            >
              {entry.explanation}
            </p>
            {/* Timestamp */}
            <span className="text-label-md block px-1" style={{ fontSize: "0.625rem" }}>
              {formatTime(entry.timestamp)}
            </span>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-1 px-1 py-2">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{
                background: "var(--primary)",
                animation: "pulse 1.4s ease-in-out infinite",
              }}
            />
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{
                background: "var(--primary)",
                animation: "pulse 1.4s ease-in-out 0.2s infinite",
              }}
            />
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{
                background: "var(--primary)",
                animation: "pulse 1.4s ease-in-out 0.4s infinite",
              }}
            />
          </div>
        )}
        <div ref={historyEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-5 mb-2 text-xs" style={{ color: "#ffb4ab" }}>
          {error}
        </div>
      )}

      {/* Bottom action bar */}
      <div
        className="px-5 py-4"
        style={{ borderTop: "1px solid rgba(73, 68, 86, 0.15)" }}
      >
        {/* Undo / Reset */}
        <div className="mb-3 flex gap-2">
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Undo
          </button>
          <button onClick={handleReset} className="btn-ghost px-3 py-1.5 text-xs">
            Reset
          </button>
        </div>

        {/* Input row */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Make the title bigger and blue..."
            disabled={isLoading}
            className="stage-input flex-1 disabled:opacity-50"
            style={{
              padding: "0.625rem 1rem",
              fontSize: "0.875rem",
              resize: "none",
            }}
          />
          <button
            onClick={handleSubmit}
            disabled={!instruction.trim() || isLoading}
            aria-label={isLoading ? "Sending edit instruction" : "Send edit instruction"}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, var(--primary), var(--primary-container))",
              transition: "box-shadow var(--transition-base)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.boxShadow = "var(--shadow-glow)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
          >
            {isLoading ? (
              <svg
                className="h-4 w-4 animate-spin text-white"
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
              <svg
                className="h-4 w-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12h12m-5-5l5 5-5 5"
                />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
