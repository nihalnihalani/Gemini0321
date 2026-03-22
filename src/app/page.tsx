"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import PromptInput from "@/components/PromptInput";
import TemplatePicker from "@/components/TemplatePicker";
import EngineSelector from "@/components/EngineSelector";
import AssetUploader from "@/components/AssetUploader";
import Navbar from "@/components/Navbar";
import type { TemplateIdOrCustom, GenerationEngine } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState<TemplateIdOrCustom>("custom");
  const [assets, setAssets] = useState<string[]>([]);
  const [engine, setEngine] = useState<GenerationEngine>("auto");

  async function handleSubmit(
    prompt: string,
    resolution: string,
    sceneCount: number,
    source?: { type: string; url: string }
  ) {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          resolution,
          sceneCount,
          templateId: templateId === "custom" ? undefined : templateId,
          engine,
          sourceType: source?.type ?? "prompt",
          sourceUrl: source?.url,
          assets: assets.length > 0 ? assets : undefined,
        }),
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
    <div className="relative min-h-screen flex flex-col">
      <Navbar />

      {/* Animated gradient mesh background */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 80% 60% at 50% 20%, rgba(92, 31, 222, 0.08) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 80% 60%, rgba(21, 150, 239, 0.05) 0%, transparent 50%),
            radial-gradient(ellipse 50% 40% at 20% 80%, rgba(149, 0, 149, 0.04) 0%, transparent 50%)
          `,
        }}
      />

      {/* Hero section */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 pt-28 pb-20">
        <div className="mb-14 text-center animate-fade-in">
          <h1
            className="font-serif text-display-lg opacity-0 animate-fade-in-up"
            style={{ animationFillMode: "forwards" }}
          >
            Transform Ideas Into{" "}
            <span className="bg-gradient-to-r from-[#cdbdff] to-[#9ccaff] bg-clip-text text-transparent">
              Cinema
            </span>
          </h1>
          <p
            className="mx-auto mt-5 max-w-2xl text-body-md opacity-0 animate-fade-in-up delay-2"
            style={{ animationFillMode: "forwards" }}
          >
            Transform your ideas into cinematic video, scene by scene. Describe
            your vision and let AI craft the script, generate the visuals, and
            compose the final cut.
          </p>
        </div>

        <div
          className="w-full max-w-3xl space-y-6 opacity-0 animate-fade-in-up delay-3"
          style={{ animationFillMode: "forwards" }}
        >
          <PromptInput onSubmit={handleSubmit} isLoading={isLoading} />

          <EngineSelector
            selected={engine}
            onChange={setEngine}
            disabled={isLoading}
          />

          <p
            className="text-label-md opacity-0 animate-fade-in-up delay-3"
            style={{ animationFillMode: "forwards" }}
          >
            Choose a Template
          </p>
          <TemplatePicker
            selected={templateId}
            onChange={setTemplateId}
            disabled={isLoading}
          />
          <AssetUploader
            assets={assets}
            onAssetsChange={setAssets}
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="mt-5 w-full max-w-3xl rounded-lg border border-[var(--error-container)] bg-[var(--error-container)]/10 px-4 py-3 text-sm text-[var(--error)]">
            {error}
          </div>
        )}
      </main>

      {/* How It Works section */}
      <section className="px-6 pb-24 pt-8">
        <h2
          className="font-serif text-headline-lg text-center mb-12 opacity-0 animate-fade-in-up delay-4"
          style={{ animationFillMode: "forwards" }}
        >
          How It Works
        </h2>

        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            {
              step: "01",
              icon: (
                <svg
                  className="h-7 w-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                  />
                </svg>
              ),
              title: "Describe",
              description:
                "Write a prompt describing the video you envision. Set your resolution and scene count.",
              delay: "delay-4",
            },
            {
              step: "02",
              icon: (
                <svg
                  className="h-7 w-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
                  />
                </svg>
              ),
              title: "Generate",
              description:
                "AI writes the script, generates video clips for each scene, and adds narration.",
              delay: "delay-5",
            },
            {
              step: "03",
              icon: (
                <svg
                  className="h-7 w-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                  />
                </svg>
              ),
              title: "Download",
              description:
                "Preview your composed video in the browser, then download the final MP4.",
              delay: "delay-6",
            },
          ].map((item) => (
            <div
              key={item.step}
              className={`rounded-xl bg-[#1b1b20] p-8 transition-all duration-200 hover:bg-[#2a292f] hover:scale-[1.02] opacity-0 animate-fade-in-up ${item.delay}`}
              style={{ animationFillMode: "forwards" }}
            >
              <div className="mb-4 flex items-center gap-3 text-[var(--primary)]">
                {item.icon}
                <span className="text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-[var(--outline)]">
                  Step {item.step}
                </span>
              </div>
              <h3 className="font-serif text-headline-md mb-2">{item.title}</h3>
              <p className="text-body-md">{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="pb-8 text-center px-6">
        <div
          className="mx-auto mb-6 max-w-4xl"
          style={{
            height: "1px",
            background: "rgba(73, 68, 86, 0.1)",
          }}
        />
        <p className="text-sm text-[var(--outline)]">
          Powered by{" "}
          <span className="text-[var(--on-surface-variant)]">Gemini</span>
          {" \u00B7 "}
          <span className="text-[var(--on-surface-variant)]">Veo</span>
          {" \u00B7 "}
          <span className="text-[var(--on-surface-variant)]">Remotion</span>
        </p>
      </footer>
    </div>
  );
}
