// Splits plain message text into text and link pieces, so web addresses render as real links.

export type TextPiece = { type: "text"; value: string } | { type: "link"; value: string; href: string };

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const TRAILING = /[.,;:!?]+$/;

// "(see https://x.com/a)" should not swallow the ")"; a balanced "(...)" inside the link is kept.
function trimTrailing(raw: string): string {
  let url = raw.replace(TRAILING, "");
  while (url.endsWith(")") && (url.match(/\(/g)?.length ?? 0) < (url.match(/\)/g)?.length ?? 0)) {
    url = url.slice(0, -1).replace(TRAILING, "");
  }
  return url;
}

// Only http/https ever become links; "www." gets https added.
export function safeHref(value: string): string | null {
  const candidate = /^www\./i.test(value) ? `https://${value}` : value;
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function splitLinks(text: string): TextPiece[] {
  const pieces: TextPiece[] = [];
  let last = 0;
  for (const match of text.matchAll(URL_RE)) {
    const start = match.index ?? 0;
    const value = trimTrailing(match[0]);
    const href = safeHref(value);
    if (!href || !value) continue;
    if (start > last) pieces.push({ type: "text", value: text.slice(last, start) });
    pieces.push({ type: "link", value, href });
    last = start + value.length;
  }
  if (last < text.length) pieces.push({ type: "text", value: text.slice(last) });
  return pieces;
}
