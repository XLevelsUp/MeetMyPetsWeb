"use client";

import { motion, useReducedMotion } from "motion/react";
import { PawPrint, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Reveal } from "@/components/motion/Reveal";
import { SectionHeading } from "@/components/ui/section-heading";
import { arrangeReels, captionPreview, videoSrc, type Reel } from "@/lib/reels";
import { site } from "@/config/site";
import { cn } from "@/lib/utils";

const PROFILE_URL = `https://www.instagram.com/${site.twitter.replace("@", "")}/`;

/**
 * Three irregular outlines, in objectBoundingBox units (0-1) so one path
 * scales to any card size without re-authoring per breakpoint.
 *
 * Each card gets a different one — three identical blobs read as a deliberate
 * UI shape, which is the opposite of the organic feel they exist to create.
 * The paths stay close to a rounded rectangle: pets are photographed centred
 * and upright, and a wilder outline crops ears and faces.
 */
const BLOB_PATHS = [
  "M0.5,0.005 C0.78,0.005 0.97,0.06 0.99,0.28 C1.01,0.5 0.99,0.72 0.97,0.85 C0.94,0.97 0.78,0.998 0.5,0.998 C0.22,0.998 0.06,0.96 0.03,0.83 C0.01,0.7 -0.01,0.48 0.01,0.27 C0.03,0.06 0.22,0.005 0.5,0.005 Z",
  "M0.5,0.002 C0.8,0.002 0.99,0.08 0.995,0.3 C1,0.52 0.96,0.7 0.98,0.86 C0.99,0.97 0.75,1 0.48,1 C0.2,1 0.04,0.95 0.02,0.8 C0,0.64 0.02,0.44 0.005,0.25 C-0.005,0.07 0.2,0.002 0.5,0.002 Z",
  "M0.52,0.004 C0.82,0.004 0.98,0.07 0.985,0.26 C0.99,0.46 0.95,0.68 0.975,0.84 C0.995,0.97 0.76,0.997 0.47,0.997 C0.19,0.997 0.02,0.94 0.015,0.78 C0.01,0.62 0.04,0.42 0.02,0.26 C0.005,0.08 0.22,0.004 0.52,0.004 Z",
];

/**
 * Inline glyph: lucide-react v1 dropped its brand icons, so there is no
 * `Instagram` export to import. Traced from the official mark.
 */
function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/**
 * A reel's video, in one of two modes.
 *
 * `featured` (the centre card) autoplays whenever it is on screen and offers a
 * mute toggle. The side cards play only while hovered or keyboard-focused.
 *
 * WHY THE SIDE CARDS DIFFER
 * Three simultaneous autoplaying mp4s means three concurrent downloads of
 * user-generated video on a page whose job is a waitlist signup. Hover-to-play
 * keeps that cost on demand: `preload="none"` means a side card fetches
 * nothing at all until the pointer arrives, so the page still costs one video.
 *
 * Playback is gated on visibility either way. Autoplaying off-screen video
 * burns bandwidth and battery for something nobody can see.
 */
function ReelVideo({
  src,
  poster,
  label,
  featured,
  hovered,
}: {
  src: string;
  poster: string | null;
  label: string;
  featured: boolean;
  hovered: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.4,
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) return;

    // Reduced motion: hold the poster frame unless the user actively hovers,
    // which is a deliberate request rather than unrequested ambient motion.
    const wanted = visible && (hovered || (featured && !reduced));

    if (wanted) {
      // play() rejects when autoplay is blocked; the poster stays visible,
      // which is a correct fallback rather than an error worth surfacing.
      void element.play().catch(() => {});
    } else {
      element.pause();
      // Side cards restart from the top, so each hover shows the reel's
      // opening frames rather than resuming mid-scene from last time.
      if (!featured) element.currentTime = 0;
    }
  }, [visible, hovered, featured, reduced]);

  return (
    <>
      <video
        ref={videoRef}
        src={src}
        poster={poster ?? undefined}
        muted={muted}
        loop
        playsInline
        // The featured card is going to play regardless, so its metadata is
        // worth fetching up front. A side card may never be hovered at all.
        preload={featured ? "metadata" : "none"}
        aria-label={label}
        onLoadedData={() => setReady(true)}
        className={cn(
          "size-full object-cover transition-opacity duration-700",
          // Side cards cross-fade from their poster image, so the swap to
          // video is a dissolve rather than a flash of empty frame.
          ready || !featured ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Sound is opt-in, and only on the featured card — a mute button on a
          card that plays for as long as the pointer rests there would be a
          control the user cannot reliably click. Autoplaying audio is also
          blocked by browsers, which would prevent playback entirely. */}
      {featured && (
        <button
          type="button"
          onClick={(event) => {
            // The card is wrapped in a link to Instagram; muting must not navigate.
            event.preventDefault();
            event.stopPropagation();
            const element = videoRef.current;
            if (!element) return;
            const next = !muted;
            setMuted(next);
            element.muted = next;
            if (!next) void element.play().catch(() => {});
          }}
          aria-label={muted ? "Unmute this reel" : "Mute this reel"}
          className="absolute bottom-5 left-5 z-30 grid size-11 place-items-center rounded-full bg-black/45 text-white backdrop-blur-md transition-colors hover:bg-black/65 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        >
          {muted ? (
            <VolumeX className="size-4.5" aria-hidden="true" />
          ) : (
            <Volume2 className="size-4.5" aria-hidden="true" />
          )}
        </button>
      )}
    </>
  );
}

/**
 * One reel card.
 *
 * A component rather than inline JSX because each card owns its own hover
 * state, and hooks cannot live inside the .map() callback.
 *
 * Hover is tracked in React state, not CSS, because it has to reach the
 * <video> element's play()/pause() calls — :hover cannot drive an imperative
 * media API. Focus counts as hover so the video is reachable by keyboard.
 */
function ReelCard({
  reel,
  featured,
  clip,
  caption,
}: {
  reel: Reel;
  featured: boolean;
  clip: string;
  caption: string;
}) {
  const [hovered, setHovered] = useState(false);

  // Side cards swap their poster <img> for a <video> on hover; the featured
  // card is video from the start. `playable` is false when Meta withheld
  // media_url for this reel — those stay a poster that opens the permalink.
  const playsVideo = reel.playable && (featured || hovered);

  return (
    <motion.a
      href={reel.permalink}
      target="_blank"
      rel="noopener noreferrer"
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      // Spring, not a duration curve: the card can be grabbed mid-motion and
      // follows the pointer without a seam. Critically damped — a hover lift
      // is not a momentum gesture, so overshoot would read as wobble.
      whileHover={{ y: -10 }}
      whileTap={{ scale: 0.985 }}
      transition={{ type: "spring", bounce: 0, duration: 0.4 }}
      className={cn(
        "group relative mx-auto block w-full rounded-[2rem]",
        // No max-width below sm: the card must fill the swipe strip's 78vw
        // slot, and a 19rem cap would leave dead space between cards on any
        // phone wider than ~390px.
        "sm:max-w-[19rem]",
        "focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 focus-visible:outline-none",
        featured ? "lg:-mt-12 lg:max-w-[21rem]" : "lg:mt-0",
      )}
    >
      {/* Offset blob behind the media — the layered, hand-cut look from the
          reference: a flat coloured shape peeking out from behind the photo.
          Counter-rotates on hover so the two layers visibly separate. */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute -inset-3 -z-10 rotate-3",
          "transition-transform duration-700 ease-out group-hover:rotate-[7deg]",
          featured ? "bg-brand/20" : "bg-secondary",
        )}
        style={{ clipPath: clip }}
      />

      <div
        className={cn(
          "relative bg-secondary",
          // Softer than 9:16 — an irregular outline eats into the corners, so
          // a very tall box leaves too little subject.
          featured ? "aspect-[4/5.3]" : "aspect-[4/4.9]",
        )}
        style={{ clipPath: clip }}
      >
        {playsVideo ? (
          <ReelVideo
            // This app's proxy, never Instagram's media_url — the proxy mints
            // a fresh signed URL per request, so playback cannot go stale.
            src={videoSrc(reel.id)}
            poster={reel.thumbnail}
            label={caption ? `Instagram reel: ${caption}` : "Instagram reel from MeetMyPets"}
            featured={featured}
            hovered={hovered}
          />
        ) : (
          reel.thumbnail && (
            /* eslint-disable-next-line @next/next/no-img-element --
               see the component doc comment: no loader, signed URLs. */
            <img
              src={reel.thumbnail}
              alt={caption ? `Instagram reel: ${caption}` : "Instagram reel from MeetMyPets"}
              loading="lazy"
              decoding="async"
              className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
            />
          )
        )}

        {/* Scrim: captions and controls sit on user photography of unknown
            brightness, so contrast cannot be assumed. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20"
        />

        {/* Play affordance, hidden as soon as video is actually running — a
            play button over playing video is a lie about what tapping does. */}
        {!playsVideo && (
          <span aria-hidden="true" className="absolute inset-0 z-10 grid place-items-center">
            <span className="grid size-14 place-items-center rounded-full bg-white/85 text-brand shadow-lift backdrop-blur-md transition-transform duration-300 ease-out group-hover:scale-110">
              <Play className="size-5 translate-x-px" strokeWidth={2.5} fill="currentColor" />
            </span>
          </span>
        )}

        {caption && (
          <p
            className={cn(
              "absolute inset-x-0 bottom-0 z-10 line-clamp-2 px-7 pb-7 text-sm leading-snug font-medium text-white",
              // The featured card clears its own mute button.
              featured && "pl-[4.75rem]",
            )}
          >
            {caption}
          </p>
        )}
      </div>

      {/* Badge sits OUTSIDE the clipped box: anything inside is cut by the
          blob outline, and a clipped pill reads as a bug. */}
      {featured && (
        <span className="absolute -top-3 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap text-white shadow-lift">
          <PawPrint className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
          Freshest paw print
        </span>
      )}
    </motion.a>
  );
}

/**
 * Latest Instagram reels — three blob-clipped cards, newest featured centre.
 *
 * LAYOUT
 * Each reel is clipped to an irregular organic outline, with a second blob
 * offset behind it in a flat brand tone. That layered, hand-cut look is the
 * pet-template shape language; a rectangle grid would read as a stock embed.
 *
 * The centre card is larger and lifted, so the row has a focal point rather
 * than three equal tiles.
 *
 * WHY clip-path AND NOT border-radius
 * An irregular outline has no radius form. The paths are declared once in a
 * single hidden <svg> and referenced by id, with clipPathUnits set to
 * objectBoundingBox so one path scales to every card at every breakpoint.
 * clip-path also reliably clips <video>, which overflow-hidden on a rounded
 * parent does not in Safari.
 *
 * Thumbnails are plain <img>: Instagram CDN URLs are signed and short-lived,
 * so there is nothing for next/image to pre-optimise.
 */
export function Reels() {
  const [all, setAll] = useState<Reel[] | null>(null);

  // Fetched on mount rather than at build: a build-time media_url is a signed
  // link that expires within hours, so the HTML would ship a dead URL.
  useEffect(() => {
    let active = true;

    fetch("/api/instagram/reels")
      .then((response) => (response.ok ? response.json() : { reels: [] }))
      .then((body: { reels?: Reel[] }) => {
        if (active) setAll(Array.isArray(body.reels) ? body.reels : []);
      })
      .catch(() => {
        // The section hides itself on failure; a visitor can do nothing with
        // an error message about our Instagram feed.
        if (active) setAll([]);
      });

    return () => {
      active = false;
    };
  }, []);

  // null = still loading. Render nothing rather than a skeleton: this sits
  // above the footer, and a placeholder that resolves to nothing would shift
  // the page under anyone already scrolled there.
  if (all === null || all.length === 0) return null;

  const { reels, featuredIndex } = arrangeReels(all);

  return (
    <section id="reels" className="relative scroll-mt-24 overflow-hidden py-20 sm:py-28">
      {/* Clip-path definitions. One hidden svg for the whole section — a
          <clipPath> per card would duplicate three identical paths per reel. */}
      <svg aria-hidden="true" className="pointer-events-none absolute size-0">
        <defs>
          {BLOB_PATHS.map((d, index) => (
            <clipPath key={index} id={`reel-blob-${index}`} clipPathUnits="objectBoundingBox">
              <path d={d} />
            </clipPath>
          ))}
        </defs>
      </svg>

      {/* DECORATIVE GROUND
          Organic blobs + a dot grid, in brand tokens rather than the pink of
          the usual pet-template look — every other section on this page is
          terracotta, and a second accent here would read as a different site.
          Everything sits at low opacity behind the row: the reels are user
          photography of unknown brightness, and decoration that competes with
          them costs contrast on the one thing the section exists to show. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(48rem 26rem at 50% 12%, var(--brand-soft), transparent 72%)",
        }}
      />

      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 size-full"
        preserveAspectRatio="xMidYMid slice"
        viewBox="0 0 1200 800"
        fill="none"
      >
        <path
          fill="var(--brand)"
          opacity="0.07"
          d="M143 168c46-52 132-64 178-22 46 42 30 118-14 158-44 40-116 52-160 14-44-38-50-98-4-150Z"
        />
        <path
          fill="var(--brand)"
          opacity="0.05"
          d="M1002 486c58-30 148 6 166 72 18 66-40 132-108 140-68 8-138-38-142-104-4-66 26-78 84-108Z"
        />
        <path
          fill="var(--verified)"
          opacity="0.05"
          d="M905 92c40-34 112-18 134 30 22 48-10 108-60 120-50 12-106-18-112-64-6-46-2-52 38-86Z"
        />
      </svg>

      {/* Dot grid — the texture layer from the reference template. Masked so
          it fades before it reaches the cards; a grid running under the
          photography would read as noise on top of the reels. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.5]"
        style={{
          backgroundImage: "radial-gradient(var(--border) 1.5px, transparent 1.5px)",
          backgroundSize: "26px 26px",
          maskImage:
            "radial-gradient(60rem 30rem at 50% 45%, transparent 38%, black 78%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(60rem 30rem at 50% 45%, transparent 38%, black 78%, transparent 100%)",
        }}
      />

      {/* Two paw prints kept as literal signature, well away from the cards. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07]">
        <PawPrint className="absolute top-[14%] right-[7%] size-14 rotate-12 text-brand" />
        <PawPrint className="absolute bottom-[10%] left-[9%] size-12 -rotate-12 text-brand" />
      </div>

      <div className="section-shell">
        <SectionHeading
          eyebrow="Paw spotlight"
          title="Meet. Play. Share. Repeat."
          body="See the latest moments from our growing pet community."
        />

        {/* MOBILE: swipe strip. TABLET/DESKTOP: grid.
            Below sm the three cards run horizontally with scroll-snap, so the
            section costs one card of height instead of three — stacked, these
            blob cards ran past 1200px on a 375px screen, which is a lot of
            scrolling to reach the footer.

            One element switches between the two layouts rather than rendering
            the list twice: a duplicated list would mount three more <video>
            elements and double the DOM for every reel.

            Negative margins + matching padding let the strip bleed to the
            screen edges while its first card still lines up with the page
            gutter — a strip that stops at the container edge reads as clipped
            rather than scrollable. */}
        <div
          className={cn(
            "-mx-5 flex snap-x snap-mandatory gap-5 overflow-x-auto px-5 pb-4",
            // pt-4 is load-bearing: overflow-x-auto clips vertically as well
            // as horizontally, and the featured badge sits above its card at
            // -top-3. Without headroom inside the scroller the badge is cut
            // off on mobile. mt-12 + pt-4 keeps the visual gap at 16.
            "mt-12 pt-4 sm:mt-16 sm:pt-0",
            // scroll-pb keeps the snap from fighting the pb-4 scroll padding.
            "scroll-pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            // From sm up it is a plain grid again; snap/overflow are inert
            // once nothing overflows, but they are cleared for clarity.
            "sm:mx-0 sm:grid sm:snap-none sm:grid-cols-2 sm:items-center sm:gap-8 sm:overflow-visible sm:px-0 sm:pb-0",
            "lg:grid-cols-3 lg:gap-10",
          )}
        >
          {reels.map((reel, index) => {
            const caption = captionPreview(reel.caption);
            const featured = index === featuredIndex;
            const clip = `url(#reel-blob-${index % BLOB_PATHS.length})`;

            return (
              <Reveal
                key={reel.id}
                delay={index * 0.09}
                className={cn(
                  // 78% of the viewport leaves the next card peeking, which is
                  // the affordance that tells a user the row scrolls at all.
                  "w-[78vw] shrink-0 snap-center",
                  "sm:w-auto sm:shrink",
                  // The odd card out would sit alone on a 2-up tablet row, so
                  // it spans both columns there and returns to 1/3 at lg.
                  index === 2 && "sm:col-span-2 lg:col-span-1",
                  // Featured card leads the reading order on tablet, where the
                  // 2-up grid would otherwise bury it in second place.
                  featured && "sm:order-first lg:order-none",
                )}
              >
                <ReelCard reel={reel} featured={featured} clip={clip} caption={caption} />
              </Reveal>
            );
          })}
        </div>

        {/* Swipe hint. Mobile only — on a grid there is nothing to swipe. */}
        <p className="mt-1 text-center text-xs text-ink-soft sm:hidden">Swipe for more</p>

        <Reveal className="mt-16 flex justify-center">
          <a
            href={PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            // Hover fills with brand, matching the primary CTA treatment in
            // MagneticButton. White sits on --brand at 4.61:1 in light mode;
            // dark mode's lighter --brand would only reach 3.09:1, so the
            // border darkens to brand-ink there to keep the edge defined.
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm font-semibold shadow-soft transition-colors hover:border-brand-ink hover:bg-brand hover:text-white focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <InstagramGlyph className="size-4.5" />
            Follow our community on Instagram
          </a>
        </Reveal>
      </div>
    </section>
  );
}
