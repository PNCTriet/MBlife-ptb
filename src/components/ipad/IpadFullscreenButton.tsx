"use client";

import { useCallback, useEffect, useState } from "react";

/** iPadOS Safari only exposes the webkit-prefixed Fullscreen API. */
type WebkitFullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type WebkitFullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

function isFullscreen(): boolean {
  const doc = document as WebkitFullscreenDocument;
  return Boolean(doc.fullscreenElement ?? doc.webkitFullscreenElement);
}

export function IpadFullscreenButton() {
  const [supported, setSupported] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const root = document.documentElement as WebkitFullscreenElement;
    setSupported(
      typeof root.requestFullscreen === "function" ||
        typeof root.webkitRequestFullscreen === "function"
    );

    const sync = () => setActive(isFullscreen());
    sync();

    document.addEventListener("fullscreenchange", sync);
    document.addEventListener("webkitfullscreenchange", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      document.removeEventListener("webkitfullscreenchange", sync);
    };
  }, []);

  const toggle = useCallback(async () => {
    const root = document.documentElement as WebkitFullscreenElement;
    const doc = document as WebkitFullscreenDocument;

    try {
      if (isFullscreen()) {
        await (doc.exitFullscreen?.() ?? doc.webkitExitFullscreen?.());
      } else {
        await (root.requestFullscreen?.() ?? root.webkitRequestFullscreen?.());
      }
    } catch {
      // Denied (no user gesture / unsupported) — leave the screen as-is.
    }
  }, []);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={active ? "Thoát toàn màn hình" : "Toàn màn hình"}
      title={active ? "Thoát toàn màn hình" : "Toàn màn hình"}
      className="ipad-fullscreen-btn"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        {active ? (
          <path
            d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : (
          <path
            d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </svg>
    </button>
  );
}
