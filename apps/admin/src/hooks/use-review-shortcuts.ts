"use client";

import { useEffect } from "react";

/**
 * `A` to approve, `R` to reject — for high-throughput review.
 *
 * ⚠️ THE GUARD IS THE POINT. These are unmodified single letters, so without
 * care they fire while a moderator is typing: entering the rejection reason
 * "animal was..." would trigger an approve on the first keystroke. The handler
 * therefore ignores the event whenever focus is in a text field, a
 * contenteditable region, or anywhere inside an open dialog — which is exactly
 * when the confirmation is on screen and the reason is being written.
 *
 * Modifier combinations are also ignored so browser and OS shortcuts
 * (Ctrl+A, Cmd+R) keep working.
 */
export function useReviewShortcuts({
  onApprove,
  onReject,
  enabled,
}: {
  onApprove: () => void;
  onReject: () => void;
  enabled: boolean;
}) {
  useEffect(() => {
    if (!enabled) return;

    function isTypingContext(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (target.isContentEditable) return true;
      // Any open dialog/alertdialog means a confirmation is up and the letter
      // keys belong to whatever is being typed inside it.
      return Boolean(target.closest('[role="dialog"], [role="alertdialog"]'));
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingContext(event.target)) return;
      // A dialog can hold focus on <body> rather than an element inside it,
      // so check the document for an open one as well.
      if (document.querySelector('[role="alertdialog"]')) return;

      const key = event.key.toLowerCase();
      if (key === "a") {
        event.preventDefault();
        onApprove();
      } else if (key === "r") {
        event.preventDefault();
        onReject();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onApprove, onReject, enabled]);
}
