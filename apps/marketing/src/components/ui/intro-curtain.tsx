"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/** WebM first (187KB), MP4 fallback for Safari. Both are video-only. */
const SOURCES = [
  { src: "/intro-dog-cat.webm", type: "video/webm" },
  { src: "/intro-dog-cat.mp4", type: "video/mp4" },
];
const SESSION_KEY = "mmp-intro-played";
/** 1.5x turns the 4.0s source into ~2.7s without cutting any of it. */
const PLAYBACK_RATE = 1.5;
/** Safety net above the ~2.7s runtime — caps the wait if autoplay is blocked. */
const MAX_MS = 3400;
const FADE_MS = 550;

function alreadyPlayed(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return true; // Storage blocked: skip rather than replay on every navigation.
  }
}

function markPlayed(): void {
  try {
    sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // Nothing to do — the intro just replays next load.
  }
}

/** Full-screen intro; skipped per session, under reduced motion, and on slow links. */
export function IntroCurtain() {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timers = useRef<number[]>([]);

  const dismiss = useCallback(() => {
    setLeaving(true);
    markPlayed();
    // Reveal the page now so it settles behind the fading curtain.
    document.documentElement.removeAttribute("data-intro");
    const id = window.setTimeout(() => {
      setShow(false);
      document.documentElement.classList.remove("intro-locked");
    }, FADE_MS);
    timers.current.push(id);
  }, []);

  useEffect(() => {
    // layout.tsx's head script already decided this before first paint.
    if (document.documentElement.getAttribute("data-intro") !== "pending") {
      // No attribute: leave the already-painted page alone.
      if (!alreadyPlayed()) markPlayed();
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShow(true);
    document.documentElement.classList.add("intro-locked");
  }, []);

  useEffect(() => {
    if (!show || leaving) return;

    const started = performance.now();
    let raf = 0;
    const tick = () => {
      const pct = Math.min(100, ((performance.now() - started) / MAX_MS) * 100);
      setProgress(pct);
      if (pct < 100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const hardStop = window.setTimeout(dismiss, MAX_MS);
    timers.current.push(hardStop);

    // Re-set on media events below too — loading resets it.
    const video = videoRef.current;
    if (video) video.playbackRate = PLAYBACK_RATE;

    // Autoplay can be refused (iOS Low Power Mode); MAX_MS covers that.
    void video?.play().catch(() => {});

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter" || event.key === " ") dismiss();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
  }, [show, leaving, dismiss]);

  useEffect(() => {
    const list = timers.current;
    return () => {
      list.forEach((id) => window.clearTimeout(id));
      document.documentElement.classList.remove("intro-locked");
      document.documentElement.removeAttribute("data-intro");
    };
  }, []);

  if (!show) return null;

  return (
    <div
      aria-hidden="true"
      onClick={dismiss}
      onTouchStart={dismiss}
      className={cn(
        "intro-curtain fixed inset-0 z-[100] grid place-items-center bg-background transition-opacity duration-[550ms] ease-out",
        leaving ? "pointer-events-none opacity-0" : "opacity-100",
      )}
    >
      {/* `cover` except portrait phones, where it would crop the animals out. */}
      <video
        ref={videoRef}
        muted
        autoPlay
        playsInline
        preload="auto"
        disablePictureInPicture
        // playbackRate is a DOM property React does not manage; loading resets it.
        onLoadedMetadata={(event) => {
          event.currentTarget.playbackRate = PLAYBACK_RATE;
        }}
        onCanPlay={(event) => {
          event.currentTarget.playbackRate = PLAYBACK_RATE;
        }}
        onPlay={(event) => {
          event.currentTarget.playbackRate = PLAYBACK_RATE;
        }}
        onTimeUpdate={(event) => {
          if (event.currentTarget.playbackRate !== PLAYBACK_RATE) {
            event.currentTarget.playbackRate = PLAYBACK_RATE;
          }
        }}
        onEnded={dismiss}
        onError={dismiss}
        className={cn(
          "absolute inset-0 mix-blend-multiply",
          "h-full w-full object-contain",
          "landscape:object-cover md:object-cover",
        )}
      >
        {SOURCES.map((source) => (
          <source key={source.src} src={source.src} type={source.type} />
        ))}
        {/* No captions track: both encodes are video-only, nothing to caption. */}
      </video>

      {/* Short viewports pin this to the bottom edge — see .intro-label. */}
      <div className="intro-label absolute inset-x-0 z-10 flex flex-col items-center gap-3 px-8 pb-[env(safe-area-inset-bottom)]">
        <p className="intro-wordmark font-wordmark text-2xl text-brand-ink sm:text-3xl">MeetMyPets</p>
        <div className="intro-bar h-1 w-40 overflow-hidden rounded-full bg-brand/15 sm:w-56">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs font-medium text-ink-soft tabular-nums">
          {Math.round(progress)}%
        </p>
      </div>
    </div>
  );
}
