"use client";

type Props = {
  src: string;
  poster?: string;
  className?: string;
};

/**
 * Animated image backgrounds are not governed by browser media-autoplay
 * policies, so they start immediately after F5 even in Low Power Mode.
 */
export function LedBackground({ src, poster, className = "" }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="eager"
      decoding="sync"
      fetchPriority="high"
      draggable={false}
      className={className}
      onError={(event) => {
        if (poster && !event.currentTarget.dataset.fallbackApplied) {
          event.currentTarget.dataset.fallbackApplied = "true";
          event.currentTarget.src = poster;
        }
      }}
    />
  );
}
