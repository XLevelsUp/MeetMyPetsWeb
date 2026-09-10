import { validateContact } from "@/lib/validation";

/**
 * Waitlist submission adapter — Google Sheets via an Apps Script web app.
 *
 * Two mechanics are load-bearing:
 *  1. Content-Type stays `text/plain` so this is a CORS simple request —
 *     Apps Script has no doOptions handler, so a preflight would never be
 *     answered. The body is still JSON.
 *  2. `mode: "no-cors"`, so the response is opaque. Reading it used to hang
 *     the form forever on submissions that had actually succeeded.
 *
 * The endpoint is public and unauthenticated by construction; the honeypot
 * filters naive bots only. See .env.example.
 */

const ENDPOINT = process.env.NEXT_PUBLIC_WAITLIST_ENDPOINT;

/**
 * Build-time constant: NEXT_PUBLIC_* values are inlined by the bundler, so
 * this resolves statically and the UI can render a configured/unconfigured
 * state without a runtime probe.
 */
export const isWaitlistConfigured = Boolean(ENDPOINT);

export type WaitlistSource = "hero" | "waitlist" | "footer" | "popup";

export type WaitlistFailure = "unconfigured" | "invalid" | "network" | "unknown";

export type WaitlistResult =
  | { ok: true }
  | { ok: false; reason: WaitlistFailure; message: string };

/**
 * Records one waitlist signup. Never throws.
 *
 * `{ ok: true }` means "the request left the browser", not "the row saved" —
 * the response is opaque, so a backend failure still shows success. Invalid
 * input is caught before any request. Reconcile the Sheet against Resend's
 * logs to catch silent breakage.
 */
export async function submitWaitlist(
  contact: string,
  source: WaitlistSource,
  honeypot = "",
): Promise<WaitlistResult> {
  const parsed = validateContact(contact);
  if (!parsed.valid) {
    return { ok: false, reason: "invalid", message: parsed.message };
  }

  if (!ENDPOINT) {
    return {
      ok: false,
      reason: "unconfigured",
      message: "The waitlist is not connected yet. Set NEXT_PUBLIC_WAITLIST_ENDPOINT.",
    };
  }

  try {
    await fetch(ENDPOINT, {
      method: "POST",
      // Do not "fix" either of these. See notes 1 and 2 above.
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      redirect: "follow",
      body: JSON.stringify({
        email: parsed.kind === "email" ? parsed.normalized : "",
        phone: parsed.kind === "phone" ? parsed.normalized : "",
        source,
        website: honeypot,
      }),
    });

    // No status to inspect — an opaque response exposes neither `ok` nor a
    // body. Resolving at all is the signal: the request was dispatched.
    return { ok: true };
  } catch {
    return {
      ok: false,
      reason: "network",
      message: "That did not reach us — check your connection and try again.",
    };
  }
}
