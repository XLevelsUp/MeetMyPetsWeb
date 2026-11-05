/**
 * Website analytics — the one module that knows event names, consent storage
 * and how GA4 is loaded. Components never call `gtag` directly.
 *
 * Two layers, deliberately different:
 *
 * - Vercel Web Analytics + Speed Insights: cookieless, aggregate, run for every
 *   visitor (mounted in SiteAnalytics). No consent prompt.
 * - Google Analytics 4: sets cookies, so it is OPT-IN. Nothing from Google loads
 *   — no script, no request — until the visitor accepts in the consent banner.
 *   Decline (or no answer) means GA simply never runs.
 *
 * Privacy policy §3, §5, §8, §14 and §15 (src/config/legal.ts) describe exactly
 * this. Change one, change the other in the same commit.
 *
 * Nothing personal is ever sent: no emails, phone numbers, names or free text.
 * Event parameters are fixed labels taken from our own markup. GA adds the
 * page location itself; UTM tags reach GA through its own page_view.
 */

export type AnalyticsEvent =
  /** Click on a real app-store link. Engagement, not a confirmed install. */
  | "app_download_click"
  /** Click on an outbound social profile (Instagram, X, …). */
  | "social_link_click"
  /** Click on WhatsApp or email — contact intent, not a confirmed lead. */
  | "contact_click"
  /** Click on a non-store primary CTA (marked `data-analytics-cta`). */
  | "primary_cta_click"
  /** A blog article was opened. Carries slug/category, which page_view does not. */
  | "blog_article_view";

type Params = Record<string, string | number | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __mmpGaInit?: boolean;
  }
}

export const CONSENT_KEY = "mmp-analytics-consent";
/** Fired on window when the visitor answers; detail is the new ConsentState. */
export const CONSENT_CHANGED = "mmp:analytics-consent";
/** Fired on window once GA is initialised and `trackEvent` will actually send. */
export const GA_READY = "mmp:ga-ready";
/** Fired by the footer's "Cookie preferences" button to reopen the banner. */
export const OPEN_PREFERENCES = "mmp:open-cookie-preferences";

export type ConsentState = "granted" | "denied" | null;

/** Hosts GA may run on. Keeps *.vercel.app aliases of production out of the property. */
const GA_HOSTS = new Set(["meetmypets.app", "www.meetmypets.app"]);

/** Draft previews carry a secret token in the URL — never sent anywhere. */
export function isPrivatePath(pathname: string): boolean {
  return pathname.startsWith("/blog-preview");
}

// Fallback when storage is blocked, so the answer still holds for this page.
let memoryConsent: ConsentState = null;

export function readConsent(): ConsentState {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    if (value === "granted" || value === "denied") return value;
  } catch {
    // Private mode / blocked storage.
  }
  return memoryConsent;
}

export function writeConsent(state: Exclude<ConsentState, null>) {
  memoryConsent = state;
  try {
    localStorage.setItem(CONSENT_KEY, state);
  } catch {
    // Private mode / blocked storage: memoryConsent carries it for this page.
  }
  window.dispatchEvent(new CustomEvent<ConsentState>(CONSENT_CHANGED, { detail: state }));
}

export function gaAllowedOnThisHost(): boolean {
  return GA_HOSTS.has(window.location.hostname);
}

/** GA's documented kill switch: while true, gtag sends nothing for that ID. */
function setGaDisabled(measurementId: string, disabled: boolean) {
  (window as unknown as Record<string, boolean>)[`ga-disable-${measurementId}`] = disabled;
}

/**
 * Load GA4 once. Only ever called after the visitor has accepted.
 *
 * Owns the whole init so the order is guaranteed: consent → js → config come
 * before any event we send, and ad features are off before the first hit.
 * Page views after this are GA's own Enhanced Measurement ("page changes based
 * on browser history events"), which sees Next.js client navigation — so we
 * never send page_view by hand, and nothing is counted twice.
 */
export function initGoogleAnalytics(measurementId: string) {
  setGaDisabled(measurementId, false);
  if (window.__mmpGaInit) return;
  window.__mmpGaInit = true;
  loadGtag(measurementId);
  window.dispatchEvent(new Event(GA_READY));
}

function loadGtag(measurementId: string) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // gtag.js only understands the `arguments` object, not a plain array.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    // 13 months, matching privacy §15 — not gtag's 2-year default.
    cookie_expires: 60 * 60 * 24 * 395,
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
}

/**
 * Withdraw: remove GA's cookies and set its kill switch. The kill switch alone
 * does NOT stop Enhanced Measurement hits, so SiteAnalytics also reloads the
 * page on withdrawal — after which GA is never initialised.
 */
export function disableGoogleAnalytics(measurementId: string) {
  setGaDisabled(measurementId, true);
  const suffix = measurementId.replace(/^G-/, "");
  const host = window.location.hostname;
  for (const name of ["_ga", `_ga_${suffix}`]) {
    for (const domain of ["", `; domain=${host}`, `; domain=.${host.replace(/^www\./, "")}`]) {
      document.cookie = `${name}=; Max-Age=0; path=/${domain}`;
    }
  }
}

/**
 * Send one event. A no-op unless GA was loaded (i.e. the visitor accepted),
 * so callers never need to check consent themselves. Returns whether it sent.
 */
export function trackEvent(name: AnalyticsEvent, params: Params = {}): boolean {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return false;
  if (isPrivatePath(window.location.pathname)) return false;

  // No page_path: GA attaches page_location to every hit itself, and gtag
  // treats `page_path` as a reserved field, not an event parameter.
  const clean: Params = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") clean[key] = typeof value === "string" ? value.slice(0, 100) : value;
  }
  window.gtag("event", name, clean);
  return true;
}
