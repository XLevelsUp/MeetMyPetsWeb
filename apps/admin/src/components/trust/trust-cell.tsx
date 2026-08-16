"use client";

import Link from "next/link";

import { statusLabel, statusVariant } from "@/components/trust/trust-format";
import { Badge } from "@/components/ui/badge";
import { copy } from "@/config/admin";
import { trustStatusFor } from "@/lib/trust-constants";
import type { PetSummary } from "@/lib/users-contract";

/**
 * A pet's standing in the app's automated trust system, for surfaces that are
 * not the trust queue itself.
 *
 * The band comes from `trustStatusFor` — the same function the queue uses — so
 * the screens can never disagree about where a score sits. A pet that needs
 * review links into `/trust`, where the ledger and the review action live;
 * `?q=<id>` is an exact match there, not a name search.
 */
export function TrustCell({ pet }: { pet: PetSummary }) {
  const status = trustStatusFor(pet.trustScore);

  // Null means the column came back empty, which is not the same as a clean
  // record — say nothing rather than imply "normal".
  if (status === null) {
    return <span className="text-muted-foreground">{copy.dashboard.noData}</span>;
  }

  const score = <span className="tabular-nums">{pet.trustScore}</span>;
  if (status === "normal") return <span className="text-muted-foreground">{score}</span>;

  return (
    <Link
      href={`/trust?q=${pet.id}`}
      className="inline-flex items-center gap-2 rounded-md underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      aria-label={`${copy.users.trustAria} ${pet.name ?? ""} — ${statusLabel(status)}`.trim()}
    >
      {score}
      <Badge variant={statusVariant(status)}>{statusLabel(status)}</Badge>
    </Link>
  );
}
