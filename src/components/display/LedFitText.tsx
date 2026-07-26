"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  /** Available width inside the LED frame (px). */
  frameWidthPx: number;
  /** Content / size fingerprint — change to remeasure. */
  fitKey: string;
  className?: string;
  children: ReactNode;
};

/** Shrinks nowrap text so glyphs stay inside the LED paint box. */
export function LedFitText({
  frameWidthPx,
  fitKey,
  className = "",
  children,
}: Props) {
  const textRef = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const text = textRef.current;
    if (!text || frameWidthPx <= 0) return;

    // Measure at natural size first.
    text.style.transform = "scale(1)";
    const available = frameWidthPx * 0.88;
    const needed = text.scrollWidth;
    const next =
      needed > available && available > 0
        ? Math.max(0.45, available / needed)
        : 1;
    setScale(next);
  }, [frameWidthPx, fitKey]);

  return (
    <span
      ref={textRef}
      className={className}
      style={{
        transform: `scale(${scale})`,
        transformOrigin: "center center",
      }}
    >
      {children}
    </span>
  );
}
