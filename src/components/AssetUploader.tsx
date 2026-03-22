"use client";

import { useState, useRef, useCallback } from "react";

interface AssetUploaderProps {
  assets: string[];
  onAssetsChange: (assets: string[]) => void;
  disabled?: boolean;
}

export default function AssetUploader({
  assets,
  onAssetsChange,
  disabled,
}: AssetUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");

        const data = await res.json();
        onAssetsChange([...assets, data.url]);
      } catch (err) {
        console.error("Upload failed:", err);
      } finally {
        setIsUploading(false);
      }
    },
    [assets, onAssetsChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;

      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files[0]) uploadFile(files[0]);
    },
    [disabled, uploadFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(file);
      e.target.value = "";
    },
    [uploadFile]
  );

  const addUrl = useCallback(() => {
    const url = urlInput.trim();
    if (!url) return;
    onAssetsChange([...assets, url]);
    setUrlInput("");
  }, [urlInput, assets, onAssetsChange]);

  const removeAsset = useCallback(
    (index: number) => {
      onAssetsChange(assets.filter((_, i) => i !== index));
    },
    [assets, onAssetsChange]
  );

  return (
    <div className="space-y-3">
      <label className="text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-[var(--outline)]">
        Assets (optional)
      </label>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 transition-all ${
          isDragging
            ? "border-[var(--primary)] bg-[var(--primary)]/5"
            : "border-[var(--outline-variant)]/20 hover:border-[var(--outline-variant)]/40"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <svg
          className="h-6 w-6 text-[var(--outline)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
          />
        </svg>
        <span className="text-sm text-[var(--outline)]">
          {isUploading
            ? "Uploading..."
            : "Drop images here or click to upload"}
        </span>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
      </div>

      {/* URL paste */}
      <div className="flex gap-2">
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addUrl()}
          placeholder="Or paste image URL..."
          disabled={disabled}
          className="flex-1 rounded-lg bg-[var(--surface-container-low)] px-3 py-2 text-sm text-[var(--on-surface)] placeholder-[var(--outline)] outline-none border border-[var(--outline-variant)]/15 focus:border-[var(--primary)] disabled:opacity-50"
        />
        <button
          type="button"
          onClick={addUrl}
          disabled={disabled || !urlInput.trim()}
          className="rounded-lg bg-[var(--surface-container-high)] px-3 py-2 text-sm text-[var(--on-surface-variant)] hover:bg-[var(--surface-bright)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Add
        </button>
      </div>

      {/* Asset thumbnails */}
      {assets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {assets.map((url, index) => (
            <div
              key={index}
              className="group relative h-16 w-16 overflow-hidden rounded-lg border border-[var(--outline-variant)]/15"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`Asset ${index + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeAsset(index)}
                className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
              >
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
