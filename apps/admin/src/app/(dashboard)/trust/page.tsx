import { Clock } from "lucide-react";
import { redirect } from "next/navigation";

import { TrustTable } from "@/components/trust/trust-table";
import { copy } from "@/config/admin";
import { requireRole } from "@/lib/dal";
import { TRUST_ROLES } from "@/lib/roles";

/**
 * Trust review queue — the human half of the app's automated moderation.
 *
 * Viewing is moderator-level; restoring is super_admin only and enforced in the
 * route. The role is read from the DAL-verified session here and passed down so
 * the client never decides its own permissions.
 */
export default async function TrustPage() {
  const session = await requireRole(...TRUST_ROLES);
  if (!session.ok) redirect("/");

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
          className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground"
        >
          <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{copy.trust.clockWarning}</span>
        </div>

        <TrustTable role={session.role} />
      </div>
    </main>
  );
}
