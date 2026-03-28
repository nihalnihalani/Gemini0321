"use client";

import { useEffect, useState } from "react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-6 transition-all duration-200"
      style={{
        backgroundColor: scrolled ? "rgba(19, 19, 24, 0.8)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: scrolled
          ? "1px solid rgba(73, 68, 86, 0.15)"
          : "1px solid transparent",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2">
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          style={{ color: "var(--primary)" }}
        >
          <path
            d="M8 5.14v14l11-7-11-7z"
            fill="currentColor"
            opacity="0.9"
          />
        </svg>
        <span
          className="font-serif font-semibold text-lg"
          style={{ color: "var(--on-surface)" }}
        >
          FlowMotion
        </span>
      </div>

      {/* Right nav */}
      <div className="flex items-center gap-3">
        <a
          href="#"
          className="text-sm font-medium px-3 py-1.5 rounded-md transition-colors duration-150"
          style={{ color: "var(--on-surface-variant)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.color = "var(--on-surface)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = "var(--on-surface-variant)")
          }
        >
          Templates
        </a>
        <button className="btn-ghost text-sm">Sign In</button>
      </div>
    </nav>
  );
}
