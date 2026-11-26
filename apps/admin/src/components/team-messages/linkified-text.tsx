"use client";

import { Fragment } from "react";

import { splitLinks } from "@/lib/linkify";

// Message text with web addresses as real links; opens in a new tab and shares nothing about the panel.
export function LinkifiedText({ text }: { text: string }) {
  return (
    <>
      {splitLinks(text).map((piece, i) =>
        piece.type === "link" ? (
          <a
            key={i}
            href={piece.href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="break-all text-sky-700 underline underline-offset-2 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-200"
          >
            {piece.value}
          </a>
        ) : (
          <Fragment key={i}>{piece.value}</Fragment>
        ),
      )}
    </>
  );
}
