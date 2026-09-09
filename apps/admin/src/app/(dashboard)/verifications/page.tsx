import { redirect } from "next/navigation";

import { VerificationsQueue } from "@/components/verifications/verifications-queue";
import { copy } from "@/config/admin";
import { searchParamsToQuery } from "@/lib/contract-shared";
import { requireRole } from "@/lib/dal";
import { VERIFICATION_ROLES } from "@/lib/roles";
import { certificatesQuerySchema } from "@/lib/verifications-contract";

/**
 * Certificate verification review queue over `pets.pet_certificates`.
 *
 * The WHOLE query — filters, sort and page — is read server-side (Next 16:
 * `searchParams` is a Promise) and handed down, so a sorted or filtered view is
 * linkable and survives a reload without a client-side `useSearchParams`
 * Suspense boundary. Same pattern as `users/page.tsx`. Every field
 * `.catch()`-defaults, so a hand-edited URL degrades to the pending queue
 * rather than erroring.
 */
export default async function VerificationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole(...VERIFICATION_ROLES);
  if (!session.ok) redirect("/");

  // Flatten the repeated-key form that URLSearchParams would otherwise reject.
  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") params.set(key, value);
    else if (Array.isArray(value) && value[0]) params.set(key, value[0]);
  }
  const initialQuery = searchParamsToQuery(certificatesQuerySchema, params);

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold">{copy.verifications.title}</h1>
          <p className="text-sm text-muted-foreground">{copy.verifications.description}</p>
        </div>
        <VerificationsQueue initialQuery={initialQuery} />
      </div>
    </main>
  );
}
