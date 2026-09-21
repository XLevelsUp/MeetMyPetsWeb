/** Client-side validation for the waitlist form — a UX affordance, not a security boundary. */

/** Local part: dot-separated chunks, so a leading/trailing/double dot is rejected. */
const EMAIL_LOCAL = "[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*";

/** Domain label: alphanumeric ends, hyphens only inside, so "-gmail" and "gmail-" fail. */
const EMAIL_LABEL = "[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?";

/** Full shape: local@label(.label)+ with a 2+ letter TLD. Not RFC 5322 — that accepts addresses no provider issues. */
const EMAIL_RE = new RegExp(`^${EMAIL_LOCAL}@(?:${EMAIL_LABEL}\\.)+[A-Za-z]{2,}$`);

/** Zero-width and non-breaking characters that survive a paste and break validation invisibly. */
const INVISIBLE_RE = /[​-‍﻿ ⁠]/g;

export type ContactKind = "email";

export type ValidationResult =
  | { valid: true; kind: ContactKind; normalized: string }
  | { valid: false; message: string };

/** Strips invisible characters and smart quotes a paste from Gmail/WhatsApp/PDF can carry. */
export function normalizeContact(raw: string): string {
  return raw.replace(INVISIBLE_RE, "").replace(/[‘’“”]/g, "").trim();
}

/** Names the specific mistake so the user is not left hunting for an invisible one. */
function emailProblem(value: string): string {
  const atCount = (value.match(/@/g) ?? []).length;

  if (atCount === 0) {
    return "That email address needs an @ — for example name@example.com.";
  }
  if (atCount > 1) {
    return "That looks like two addresses joined together — keep just one @.";
  }

  const [local, domain] = value.split("@");

  if (/\s/.test(value)) {
    return "Remove the space from your email address.";
  }
  if (local.length === 0) {
    return "Add the part before the @, like name@example.com.";
  }
  if (local.startsWith(".") || local.endsWith(".")) {
    return "An email address cannot start or end the first part with a dot.";
  }
  if (domain.length === 0) {
    return "Add a domain after the @, like gmail.com.";
  }
  if (domain.startsWith(".") || domain.endsWith(".")) {
    return "That domain is missing a part — try gmail.com rather than .com.";
  }
  if (!domain.includes(".")) {
    return "That domain is missing its ending — try gmail.com rather than gmail.";
  }
  if (domain.includes("..") || local.includes("..")) {
    return "That email address has a double dot — remove the extra one.";
  }
  if (/(^|\.)-|-(\.|$)/.test(domain)) {
    return "That domain is not valid — a part of it starts or ends with a hyphen.";
  }
  if (/\.[A-Za-z]?$/.test(domain)) {
    return "That domain ending looks incomplete — try .com or .in.";
  }

  return "That email address does not look right — check it for a typo.";
}

/** Validates an email address; the waitlist no longer accepts phone numbers. */
export function validateContact(raw: string): ValidationResult {
  const trimmed = normalizeContact(raw);

  if (trimmed.length === 0) {
    return { valid: false, message: "Enter your email address." };
  }

  if (!EMAIL_RE.test(trimmed)) {
    return { valid: false, message: emailProblem(trimmed) };
  }

  return { valid: true, kind: "email", normalized: trimmed.toLowerCase() };
}
