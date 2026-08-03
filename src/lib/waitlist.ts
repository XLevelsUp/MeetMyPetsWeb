import { validateContact } from "@/lib/validation";

/**
 * Waitlist submission adapter — Google Sheets via an Apps Script web app.
 *
 * The site is a static export, so there is no server to proxy through: the
 * browser posts straight to the script's /exec URL, which appends a row to the
 * sheet. Swapping backends means changing only this file; no UI code knows
 * what is behind it.
 *
 * TWO MECHANICS THAT ARE NOT OPTIONAL
 *
 * 1. Content-Type MUST stay `text/plain`. It makes this a CORS "simple
 *    request", which skips the preflight OPTIONS. Apps Script has no doOptions
 *    handler, so a preflight is never answered and doPost never runs — every
 *    submission would fail cross-origin. The body is still JSON; only the
 *    header is a lie, and it is a deliberate one.
 *
 * 2. `mode: "no-cors"`, which means we CANNOT read the response.
 *
 *    This file used to read it: /exec 302-redirects to
 *    script.googleusercontent.com, and that redirect target used to send
 *    Access-Control-Allow-Origin. It no longer does — it answers 405 with no
 *    CORS header at all. The browser then blocks the read and the fetch
 *    promise never settles, so the form span forever on a submission that
 *    had in fact already saved the row and sent the email.
 *
 *    Under no-cors the request still reaches Apps Script and still works; we
 *    just get an opaque response and resolve as soon as it is sent. Read the
 *    consequence in submitWaitlist before changing this back.
 *
 * SECURITY: the endpoint is public and unauthenticated by construction —
 * anyone reading the JS bundle can find it and append rows. The honeypot in
 * the form filters naive bots; it does not stop a determined person. Sheets
 * also has no unique constraint, so de-duplication is best-effort logic inside
 * the Apps Script. See .env.example.
 */

const ENDPOINT = process.env.NEXT_PUBLIC_WAITLIST_ENDPOINT;

/**
 * Build-time constant: NEXT_PUBLIC_* values are inlined by the bundler, so
 * this resolves statically and the UI can render a configured/unconfigured
 * state without a runtime probe.
 */
export const isWaitlistConfigured = Boolean(ENDPOINT);

export type WaitlistSource = "hero" | "waitlist" | "footer";

export type WaitlistFailure = "unconfigured" | "invalid" | "network" | "unknown";

export type WaitlistResult =
  | { ok: true }
  | { ok: false; reason: WaitlistFailure; message: string };

/**
 * Records one waitlist signup. Never throws — every failure path returns a
 * result the form can render next to the field.
 *
 * `honeypot` is the value of the hidden field humans never see. It is passed
 * through untouched; the Apps Script decides what to do with it (and answers
 * "ok" either way, so a bot cannot detect the filter).
 *
 * WHAT { ok: true } MEANS HERE
 *
 * "The request left the browser", not "the row was saved" — see note 2 above.
 * A server-side failure therefore shows the user a success animation.
 *
 * That is the better of the two errors available to a static site. The old
 * behaviour failed the OTHER way, on every single signup: the row saved, the
 * email sent, and the form span forever because it was waiting on a response
 * the browser would not let it read.
 *
 * What survives: invalid input is still caught before any request is made,
 * which is the only error class a user can act on anyway. What is lost:
 * detection of a genuine backend failure. Reconcile the Sheet against
 * Resend's logs periodically — a gap between them means something broke
 * silently. If signups become business-critical, put a real endpoint in front
 * of Sheets; no UI code depends on what this function talks to.
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
