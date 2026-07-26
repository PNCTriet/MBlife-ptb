"use client";

import { useEffect, useRef } from "react";

type Props = {
  src: string;
  poster?: string;
  className?: string;
};

/**
 * LED background MP4 loop. Browsers only allow autoplay when the element is
 * truly muted *before* play() — React's `muted` prop alone is not enough on
 * Safari / Low Power Mode, so we also force DOM attributes + volume = 0 and
 * keep retrying until the video is actually running.
 */
export function LedVideo({ src, poster, className = "" }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;
    let unlocked = false;
    let attempts = 0;

    const armMuted = () => {
      video.defaultMuted = true;
      video.muted = true;
      video.volume = 0;
      video.playsInline = true;
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");
      video.setAttribute("autoplay", "");
    };

    const play = async (reason: string) => {
      if (cancelled) return;
      armMuted();

      // Never restart a healthy loop — only nudge when paused.
      if (!video.paused && !video.ended && video.currentTime > 0) {
        unlocked = true;
        return;
      }

      attempts += 1;
      try {
        if (video.ended) video.currentTime = 0;
        await video.play();
        unlocked = true;
      } catch (error) {
        // Autoplay policies reject until the browser is ready; keep retrying.
        if (attempts <= 8 || attempts % 10 === 0) {
          console.debug(`[LedVideo] play blocked (${reason})`, error);
        }
      }
    };

    armMuted();
    void play("mount");

    const onReady = () => void play("ready");
    const onVisibility = () => {
      if (!document.hidden) void play("visible");
    };
    const onPause = () => {
      // Only auto-resume after we have unlocked once, otherwise Safari's
      // blocked-autoplay pause storm keeps rejecting play() forever.
      if (unlocked && !cancelled) void play("pause");
    };

    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("canplay", onReady);
    video.addEventListener("canplaythrough", onReady);
    video.addEventListener("pause", onPause);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onVisibility);
    window.addEventListener("focus", onVisibility);

    // Short burst right after F5, then a light watchdog for kiosk overnight.
    const burst = [50, 150, 400, 1000, 2000, 4000].map((ms) =>
      window.setTimeout(() => void play(`burst-${ms}`), ms)
    );
    const watchdog = window.setInterval(() => {
      if (video.paused) void play("watchdog");
    }, 2500);

    return () => {
      cancelled = true;
      burst.forEach((id) => window.clearTimeout(id));
      window.clearInterval(watchdog);
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("canplay", onReady);
      video.removeEventListener("canplaythrough", onReady);
      video.removeEventListener("pause", onPause);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onVisibility);
      window.removeEventListener("focus", onVisibility);
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      autoPlay
      loop
      muted
      playsInline
      preload="auto"
      disableRemotePlayback
      disablePictureInPicture
      controls={false}
      className={className}
    />
  );
}
