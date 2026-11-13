import { Clock } from "lucide-react";
import { redirect } from "next/navigation";

import { TrustTable } from "@/components/trust/trust-table";
import { copy } from "@/config/admin";
import { searchParamsToQuery } from "@/lib/contract-shared";
import { requireRole } from "@/lib/dal";
import { TRUST_ROLES } from "@/lib/roles";
import { trustQuerySchema } from "@/lib/trust-contract";

/**
 * Trust review queue — the human half of the app's automated moderation.
 *
 * Viewing is moderator-level; restoring is super_admin only and enforced in the
 * route. The role is read from the DAL-verified session here and passed down so
 * the client never decides its own permissions.
 */
export default async function TrustPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole(...TRUST_ROLES);
  if (!session.ok) redirect("/");

  // Flatten the repeated-key form that URLSearchParams would otherwise reject.
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") params.set(key, value);
    else if (Array.isArray(value) && value[0]) params.set(key, value[0]);
  }
  const initialQuery = searchParamsToQuery(trustQuerySchema, params);

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold">{copy.trust.title}</h1>
          <p className="text-sm text-muted-foreground">{copy.trust.description}</p>
        </div>

        {/* The single most misunderstood fact about this system. */}
        <div
          role="note"
          className="flex items-start gap-2.5 rounded-xl border border-amber-300/80 bg-amber-50/50 p-3.5 text-sm text-amber-900 shadow-2xs dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200"
        >
          <Clock className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
          <span>{copy.trust.clockWarning}</span>
        </div>

        <TrustTable role={session.role} initialQuery={initialQuery} />
      </div>
    </main>
  );
}
