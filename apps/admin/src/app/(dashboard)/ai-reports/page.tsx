import { redirect } from "next/navigation";

import { AiReportsTable } from "@/components/ai-reports/ai-reports-table";
import { copy } from "@/config/admin";
import { searchParamsToQuery } from "@/lib/contract-shared";
import { requireRole } from "@/lib/dal";
import { REPORTS_ROLES } from "@/lib/roles";
import { aiDecisionsQuerySchema } from "@/lib/ai-moderation-contract";

/**
 * AI moderation queue over `moderation.decisions`.
 *
 * Separate from /reports on purpose: that queue is user-filed complaints
 * (`matching.pet_reports`), this one is the model's own verdict on every
 * upload. They share almost no columns, the action differs, and the volumes
 * differ by orders of magnitude — one page would be half-blank on every row.
 *
 * `searchParams` is read server-side (Next 16: it is a Promise) and passed down
 * as the initial filter, so a link like /ai-reports?review=done works without a
 * client-side `useSearchParams` Suspense boundary. The value is run through the
 * contract's enum, which `.catch()`-defaults — a hand-edited URL degrades to
 * the review queue rather than erroring.
 */
export default async function AiReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole(...REPORTS_ROLES);
  if (!session.ok) redirect("/");

  // Flatten the repeated-key form that URLSearchParams would otherwise reject.
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") params.set(key, value);
    else if (Array.isArray(value) && value[0]) params.set(key, value[0]);
  }
  const initialQuery = searchParamsToQuery(aiDecisionsQuerySchema, params);

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold">{copy.aiReports.title}</h1>
          <p className="text-sm text-muted-foreground">{copy.aiReports.description}</p>
        </div>
        <AiReportsTable initialQuery={initialQuery} />
      </div>
    </main>
  );
}
