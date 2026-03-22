"use client";

import type { GenerationEngine } from "@/lib/types";
import { ENGINE_INFO } from "@/lib/types";
import type { ReactNode } from "react";

interface EngineSelectorProps {
  selected: GenerationEngine;
  onChange: (engine: GenerationEngine) => void;
  disabled?: boolean;
}

const ENGINE_ICONS: Record<GenerationEngine, ReactNode> = {
  veo3: (
    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 7.25 6 7.754 6 8.375m0 0v1.5c0 .621-.504 1.125-1.125 1.125M6 8.375v-1.5m0 1.5c0-.621.504-1.125 1.125-1.125h1.5c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125m0-2.625h1.5M7.125 11h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M8.625 11c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-1.5 0h1.5m6.75-12h1.5c.621 0 1.125.504 1.125 1.125M18 7.25v-1.5m0 1.5c0-.621-.504-1.125-1.125-1.125h-1.5c-.621 0-1.125.504-1.125 1.125m0 0v1.5c0 .621.504 1.125 1.125 1.125M14.25 8.375v-1.5m0 0c0-.621.504-1.125 1.125-1.125h1.5"
      />
    </svg>
  ),
  "nano-banan": (
    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
      />
    </svg>
  ),
  auto: (
    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
      />
    </svg>
  ),
};

const ENGINES: GenerationEngine[] = ["veo3", "nano-banan", "auto"];

export default function EngineSelector({
  selected,
  onChange,
  disabled,
}: EngineSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-[var(--outline)]">
        Generation Engine
      </label>
      <div className="grid grid-cols-3 gap-3">
        {ENGINES.map((engineId) => {
          const info = ENGINE_INFO[engineId];
          const isSelected = selected === engineId;
          return (
            <button
              key={engineId}
              type="button"
              onClick={() => onChange(engineId)}
              disabled={disabled}
              className={`group relative flex flex-col items-center gap-2 rounded-xl p-4 text-center transition-all duration-200 border ${
                isSelected
                  ? "bg-[#5c1fde]/15 border-[#cdbdff]/40 shadow-[0_0_20px_rgba(92,31,222,0.2)]"
                  : "bg-[#1b1b20] border-[var(--outline-variant)]/15 hover:bg-[#2a292f] hover:border-[var(--outline-variant)]/30"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div
                className={`transition-colors ${
                  isSelected
                    ? "text-[#cdbdff]"
                    : "text-[var(--outline)] group-hover:text-[var(--on-surface)]"
                }`}
              >
                {ENGINE_ICONS[engineId]}
              </div>
              <span
                className={`text-sm font-medium ${
                  isSelected ? "text-[var(--on-surface)]" : "text-[var(--outline)]"
                }`}
              >
                {info.name}
              </span>
              <span className="text-[0.65rem] text-[var(--outline)] leading-tight line-clamp-2">
                {info.description}
              </span>
              {engineId === "auto" && (
                <span className="absolute top-2 left-2 rounded-full bg-[#5c1fde]/30 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider text-[#cdbdff]">
                  Recommended
                </span>
              )}
              {isSelected && (
                <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-[#cdbdff] shadow-[0_0_8px_rgba(205,189,255,0.5)]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
