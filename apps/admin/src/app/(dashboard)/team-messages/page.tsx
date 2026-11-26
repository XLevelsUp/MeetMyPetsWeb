import { HandHeart, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { TeamHistory } from "@/components/team-messages/team-history";
import { copy } from "@/config/admin";
import { requireRole } from "@/lib/dal";
import { TEAM_MESSAGE_ROLES } from "@/lib/roles";
import { searchParamsToQuery } from "@/lib/contract-shared";
import { historyQuerySchema } from "@/lib/team-messages-contract";

// Tab state is parsed here so the client needs no useSearchParams Suspense boundary.
export default async function TeamMessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireRole(...TEAM_MESSAGE_ROLES);
  if (!session.ok) redirect("/");

  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first) params.set(key, first);
  }
  // Bad or missing values fall back to defaults (Sent, any date, page 1) instead of erroring.
  const parsed = searchParamsToQuery(historyQuerySchema, params);
  const initial = {
    state: parsed.state,
    from: parsed.from ?? "",
    to: parsed.to ?? "",
    sender: parsed.sender ?? "all",
    audience: parsed.audience ?? ("any" as const),
    q: parsed.q ?? "",
    page: parsed.page,
    pageSize: parsed.pageSize,
  };

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="font-heading text-2xl font-semibold">{copy.teamMessages.title}</h1>
            <p className="text-sm text-muted-foreground">{copy.teamMessages.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" render={<Link href="/team-messages/welcome" />}>
              <HandHeart className="mr-1 size-4" aria-hidden="true" />
              {copy.teamMessages.welcome.navButton}
            </Button>
            <Button render={<Link href="/team-messages/new" />}>
              <Plus className="mr-1 size-4" aria-hidden="true" />
              {copy.teamMessages.newMessage}
            </Button>
          </div>
        </div>
        <TeamHistory initial={initial} />
      </div>
    </main>
  );
}
