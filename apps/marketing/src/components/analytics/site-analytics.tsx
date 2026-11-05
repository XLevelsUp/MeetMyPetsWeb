"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { useEffect, useState, useSyncExternalStore } from "react";

import { ConsentBanner } from "@/components/analytics/consent-banner";
import {
  CONSENT_CHANGED,
  OPEN_PREFERENCES,
  type AnalyticsEvent,
  disableGoogleAnalytics,
  gaAllowedOnThisHost,
  initGoogleAnalytics,
  isPrivatePath,
  readConsent,
  trackEvent,
  writeConsent,
} from "@/lib/analytics";

/**
 * Mounted once, in the root layout. Owns every analytics side effect on the
 * site so nothing is installed twice. See src/lib/analytics.ts for the rules.
 *
 * `gaId` is null outside the production deployment (local, preview), so GA
 * and the consent banner don't exist there at all. `vercel` is false off
 * Vercel, where /_vercel/* doesn't exist and the scripts would only 404.
 */
export function SiteAnalytics({ gaId, vercel }: { gaId: string | null; vercel: boolean }) {
  // "off": GA not configured here (non-production, other host) or server render.
  // "unset": production visitor who hasn't answered yet → banner.
  const consent = useSyncExternalStore(
    subscribeConsent,
    () => (gaId && gaAllowedOnThisHost() ? (readConsent() ?? "unset") : "off"),
    () => "off",
  );
  const [reopened, setReopened] = useState(false);

  // Footer "Cookie preferences" reopens the banner to change the answer.
  useEffect(() => {
    const onOpen = () => setReopened(true);
    window.addEventListener(OPEN_PREFERENCES, onOpen);
    return () => window.removeEventListener(OPEN_PREFERENCES, onOpen);
  }, []);

  // GA follows consent: load on accept, kill + clear cookies on withdrawal.
  useEffect(() => {
    if (!gaId) return;
    if (consent === "granted" && !isPrivatePath(window.location.pathname)) initGoogleAnalytics(gaId);
    else if (consent === "denied") disableGoogleAnalytics(gaId);
  }, [gaId, consent]);

  const bannerOpen = consent === "unset" || (reopened && consent !== "off");

  // One delegated listener for every outbound/CTA link on the site. Delegation
  // means server-rendered links need no client code and no per-button handler
  // that could double-fire on re-render.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.type === "auxclick" && event.button !== 1) return;
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (link instanceof HTMLAnchorElement) classifyAndTrack(link);
    };
    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("auxclick", onClick, { capture: true });
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("auxclick", onClick, { capture: true });
    };
  }, []);

  return (
    <>
      {vercel && (
        <>
          <Analytics beforeSend={dropPrivate} />
          <SpeedInsights beforeSend={dropPrivate} />
        </>
      )}
      {bannerOpen && (
        <ConsentBanner
          current={consent === "granted" || consent === "denied" ? consent : null}
          onAnswer={(answer) => {
            const withdrawing = consent === "granted" && answer === "denied";
            writeConsent(answer);
            setReopened(false);
            // gtag.js keeps sending Enhanced Measurement hits (clicks, scrolls)
            // even with ga-disable set — verified. A reload is the only
            // guaranteed stop: GA is never initialised on a declined page.
            if (withdrawing) window.location.reload();
          }}
        />
      )}
    </>
  );
}

/** Re-read consent when this tab answers, or another tab changes it. */
function subscribeConsent(onChange: () => void) {
  window.addEventListener(CONSENT_CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CONSENT_CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function dropPrivate<T extends Pick<BeforeSendEvent, "url">>(event: T): T | null {
  return isPrivatePath(new URL(event.url).pathname) ? null : event;
}

const SOCIAL: Record<string, string> = {
  "instagram.com": "instagram",
  "x.com": "x",
  "twitter.com": "x",
  "facebook.com": "facebook",
  "linkedin.com": "linkedin",
  "youtube.com": "youtube",
};

function classifyAndTrack(link: HTMLAnchorElement) {
  let url: URL;
  try {
    url = new URL(link.href, window.location.href);
  } catch {
    return;
  }
  const host = url.hostname.replace(/^www\./, "");
  const base = { cta_location: locationOf(link), button_label: labelOf(link) };

  let name: AnalyticsEvent | null = null;
  let extra: Record<string, string> = {};
  if (host === "play.google.com") {
    name = "app_download_click";
    extra = { destination_platform: "google_play" };
  } else if (host === "apps.apple.com") {
    name = "app_download_click";
    extra = { destination_platform: "app_store" };
  } else if (SOCIAL[host]) {
    name = "social_link_click";
    extra = { social_platform: SOCIAL[host] };
  } else if (host === "wa.me" || host === "api.whatsapp.com") {
    name = "contact_click";
    extra = { contact_method: "whatsapp" };
  } else if (url.protocol === "mailto:") {
    name = "contact_click";
    extra = { contact_method: "email" };
  } else if (link.closest("[data-analytics-cta]")) {
    name = "primary_cta_click";
    // Path + hash only: an internal destination, never a query string.
    extra = { destination: `${url.pathname}${url.hash}` };
  }
  if (name) trackEvent(name, { ...base, ...extra });
}

/** Where on the page the link sits — an explicit tag wins, then landmarks. */
function locationOf(link: Element): string {
  const tagged = link.closest("[data-analytics-location]")?.getAttribute("data-analytics-location");
  if (tagged) return tagged;
  if (link.closest("header")) return "header";
  if (link.closest("footer")) return "footer";
  const section = link.closest("section[id]");
  if (section) return section.id;
  return "page";
}

/**
 * Our own visible text or aria-label — static marketing copy, never user input.
 * Phone numbers and addresses are stripped even though they're ours (the
 * WhatsApp labels carry the business number): no PII-shaped value goes to GA.
 */
function labelOf(link: Element): string {
  const explicit = link.getAttribute("data-analytics-label") ?? link.getAttribute("aria-label");
  return (explicit ?? link.textContent ?? "")
    .replace(/\S+@\S+/g, "")
    .replace(/\+?\d[\d\s()-]{6,}\d/g, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s+/g, " ")
    .replace(/[\s—–(-]+$/, "")
    .trim()
    .slice(0, 80);
}
