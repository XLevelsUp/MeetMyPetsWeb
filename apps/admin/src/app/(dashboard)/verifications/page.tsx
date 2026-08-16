import { redirect } from "next/navigation";

import { VerificationsQueue } from "@/components/verifications/verifications-queue";
import { copy } from "@/config/admin";
import { requireRole } from "@/lib/dal";
import { VERIFICATION_ROLES } from "@/lib/roles";
import { certificatesQuerySchema, type CertificatesQuery } from "@/lib/verifications-contract";

/**
 * Certificate verification review queue over `pets.pet_certificates`.
 *
 * `searchParams` is read server-side (Next 16: it is a Promise) and passed as
 * the initial status filter, so /verifications?status=approved works without a
 * client-side `useSearchParams` Suspense boundary. The value goes through the
 * contract's `.catch()`-defaulted enum, so a hand-edited URL degrades to the
 * pending queue rather than erroring.
 */
export default async function VerificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireRole(...VERIFICATION_ROLES);
  if (!session.ok) redirect("/");

  const { status } = await searchParams;
  const initialStatus: CertificatesQuery["status"] =
    certificatesQuerySchema.shape.status.parse(status);

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold">{copy.verifications.title}</h1>
          <p className="text-sm text-muted-foreground">{copy.verifications.description}</p>
        </div>
        <VerificationsQueue initialStatus={initialStatus} />
      </div>
    </main>
  );
}
