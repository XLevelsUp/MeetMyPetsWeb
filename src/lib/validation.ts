/**
 * Client-side validation for the waitlist form.
 *
 * This is a UX affordance, not a security boundary — anything here can be
 * bypassed by anyone with devtools. Storage is a Google Sheet, which has no
 * constraints of its own, so the Apps Script in .env.example is the only
 * check that actually holds: it rejects empty submissions and de-duplicates
 * before appending a row.
 */

/**
 * Pragmatic email shape check. Deliberately not RFC 5322 — that regex accepts
 * addresses no mail provider will issue and rejects nothing users actually
 * type. Requires a dot-separated TLD, which is what catches real typos.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/**
 * E.164-ish: optional +, 8–15 digits. Separators are stripped before testing,
 * so "+91 98765 43210" and "+919876543210" both pass.
 */
const PHONE_RE = /^\+?[1-9]\d{7,14}$/;

export type ContactKind = "email" | "phone";

export type ValidationResult =
  | { valid: true; kind: ContactKind; normalized: string }
  | { valid: false; message: string };

export function normalizePhone(raw: string): string {
  return raw.replace(/[\s()\-.]/g, "");
}

export function looksLikePhone(raw: string): boolean {
  const trimmed = raw.trim();
  // Treat as a phone attempt if it has no @ and is mostly digits.
  return !trimmed.includes("@") && /\d/.test(trimmed);
}

/**
 * Accepts either an email address or a phone number in one field and reports
 * which it parsed. Error messages state the cause and the fix, per WCAG 3.3.3.
 */
export function validateContact(raw: string): ValidationResult {
  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return { valid: false, message: "Enter an email address or mobile number." };
  }

  if (looksLikePhone(trimmed)) {
    const normalized = normalizePhone(trimmed);
    if (!PHONE_RE.test(normalized)) {
      return {
        valid: false,
        message:
          "That mobile number does not look right. Include the country code, for example +91 98765 43210.",
      };
    }
    return { valid: true, kind: "phone", normalized };
  }

  if (!EMAIL_RE.test(trimmed)) {
    return {
      valid: false,
      message: "That email address is missing something — check for a typo, like name@example.com.",
    };
  }

  return { valid: true, kind: "email", normalized: trimmed.toLowerCase() };
}
