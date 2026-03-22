"use client";

interface LoadingSkeletonProps {
  lines?: number;
  className?: string;
}

const LINE_WIDTHS = ["100%", "85%", "70%", "92%", "60%", "78%"];

export default function LoadingSkeleton({
  lines = 3,
  className = "",
}: LoadingSkeletonProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton skeleton-text"
          style={{
            width: LINE_WIDTHS[i % LINE_WIDTHS.length],
            animationDelay: `${i * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
}
