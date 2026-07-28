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
 * 2. We can read the response. /exec 302-redirects to
 *    script.googleusercontent.com, which does send Access-Control-Allow-Origin,
 *    so fetch follows it and we get a real ok/failure rather than an opaque
 *    result. That is what keeps the success animation honest.
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
    const response = await fetch(ENDPOINT, {
      method: "POST",
      // Do not "fix" this to application/json. See note 1 above.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      redirect: "follow",
      body: JSON.stringify({
        email: parsed.kind === "email" ? parsed.normalized : "",
        phone: parsed.kind === "phone" ? parsed.normalized : "",
        source,
        website: honeypot,
      }),
    });

    if (!response.ok) {
      return {
        ok: false,
        reason: "unknown",
        message: "We could not save that just now. Please try again in a moment.",
      };
    }

    // The script reports duplicates as { ok: true } — a repeat signup is a
    // success from the user's point of view, and saying otherwise would
    // confirm to a stranger which addresses are already on the list.
    const body = (await response.json().catch(() => null)) as { ok?: boolean } | null;

    if (body?.ok === false) {
      return {
        ok: false,
        reason: "unknown",
        message: "We could not save that just now. Please try again in a moment.",
      };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      reason: "network",
      message: "That did not reach us — check your connection and try again.",
    };
  }
}
