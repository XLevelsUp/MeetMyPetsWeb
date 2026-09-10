"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * VP9/WebM first (187KB), H.264/MP4 fallback (550KB) for Safari. Both are
 * video-only — the source clip's audio track was stripped, so nothing can
 * play sound even if `muted` were ever removed.
 */
const SOURCES = [
  { src: "/intro-dog-cat.webm", type: "video/webm" },
  { src: "/intro-dog-cat.mp4", type: "video/mp4" },
];
const SESSION_KEY = "mmp-intro-played";
/**
 * Hard ceiling. The clip is 4.0s and ends on an empty white frame, but a
 * stalled network or a browser that refuses autoplay must never leave a
 * visitor staring at a curtain — this dismisses it regardless.
 */
/**
 * The clip runs faster than real time so the intro is over sooner without
 * cutting any of it — the animals still run in, greet and run off, just
 * briskly. 1.5x turns the 4.0s source into ~2.7s.
 */
const PLAYBACK_RATE = 1.5;
/**
 * Safety net only — the clip normally ends itself via `onEnded` at ~2.7s.
 * This sits just above that so it never truncates a healthy playthrough,
 * while still capping the wait if autoplay is blocked or the file stalls.
 */
const MAX_MS = 3400;
/** Cross-fade out. Kept short: this is the last thing between them and the page. */
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

/**
 * Full-screen intro: the dog and cat run in, greet, and run off, then the
 * curtain fades to reveal the landing page. A progress bar counts up
 * underneath so the wait reads as loading, not as a stall.
 *
 * WHAT MAKES THIS SAFE TO SHIP
 * A preloader is pure added latency, so every escape hatch is wired:
 *   - once per tab session (sessionStorage), never on repeat navigations
 *   - skipped entirely under `prefers-reduced-motion`
 *   - skipped when the browser reports Save-Data or 2g/slow-2g
 *   - dismissed by MAX_MS no matter what, including when autoplay is denied
 *     (iOS Low Power Mode blocks it even muted) or the file 404s
 *   - click / tap / Escape / any key skips immediately
 *
 * MOBILE
 * Runs on phones too. `muted` + `playsInline` + `autoPlay` is the exact
 * combination iOS Safari requires; without `playsInline` it would try to
 * open fullscreen. The clip is 1280x720 landscape and the page is portrait,
 * so `object-contain` letterboxes it onto the cream ground rather than
 * cropping the animals out of frame.
 *
 * SEO / CWV
 * Renders nothing on the server and mounts after hydration, so the crawled
 * HTML is the real landing page. It is `position: fixed` above the page
 * rather than replacing it, so the hero still paints underneath and the
 * video (a plain <video>, never an LCP candidate) does not become the
 * largest paint. `aria-hidden` + `pointer-events-none` once dismissed.
 *
 * The clip's own background is #FFFFFF and the site's is #FAF9F6, so the
 * curtain is painted cream and the video sits on it with a soft multiply
 * blend — otherwise a visible white rectangle would sit on a cream page.
 */
export function IntroCurtain() {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timers = useRef<number[]>([]);

  const dismiss = useCallback(() => {
    setLeaving(true);
    markPlayed();
    // Reveal the page underneath immediately so it is painted and settled
    // behind the curtain while the curtain itself fades out.
    document.documentElement.removeAttribute("data-intro");
    const id = window.setTimeout(() => {
      setShow(false);
      document.documentElement.classList.remove("intro-locked");
    }, FADE_MS);
    timers.current.push(id);
  }, []);

  useEffect(() => {
    // The blocking script in layout.tsx already ran every eligibility check
    // (session, reduced motion, Save-Data, 2g) before first paint and
    // recorded the verdict on <html>. Re-deciding here could disagree with
    // what has already been painted, so this only reads that verdict.
    if (document.documentElement.getAttribute("data-intro") !== "pending") {
      // Defensive: if the attribute is somehow absent but this session has
      // not played the intro, leave the page visible rather than showing a
      // curtain over an already-painted page.
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

    // Set the rate before play(): some browsers reset playbackRate when a
    // new source finishes loading, so it is set again on `loadeddata` too.
    const video = videoRef.current;
    if (video) video.playbackRate = PLAYBACK_RATE;

    // Autoplay can be refused (iOS Low Power Mode) even when muted; the
    // MAX_MS timer already covers that, so the rejection is not an error.
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
      {/* Fills the viewport rather than sitting as a centred box.
          `object-cover` on landscape/desktop, where the crop off a 16:9
          clip is mild. On portrait phones cover would zoom in hard enough
          to push the dog and cat out of frame — the entrance from the left
          and right edges is the whole point — so there the video keeps its
          aspect ratio at full viewport width and sits centred on the cream
          ground, which reads as the same full-screen moment. */}
      <video
        ref={videoRef}
        muted
        autoPlay
        playsInline
        preload="auto"
        disablePictureInPicture
        // playbackRate is a DOM property, not a React-managed prop, and it
        // gets reset to 1 as the element loads and re-renders. Re-asserting
        // it on each of these (including `timeupdate`, which fires several
        // times a second during playback) is what actually keeps the clip
        // running at speed for its whole duration.
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
        {/* No <track kind="captions">: both encodes are video-only — the
            source clip's audio track was stripped during conversion — so
            there is no speech or audio information to caption. The whole
            curtain is aria-hidden and skippable besides. */}
      </video>

      {/* Above the now full-bleed video. The clip's lower band is empty in
          every frame, so the wordmark needs no scrim — but only when there
          is room below the animals. On a short landscape phone (~390px
          tall) 10vh is 39px and the label lands on top of them, so short
          viewports pin it to the bottom edge instead, clear of the action
          and of the home indicator. */}
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
