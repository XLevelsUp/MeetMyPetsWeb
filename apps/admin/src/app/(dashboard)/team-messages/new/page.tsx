import { redirect } from "next/navigation";

import { ComposerBackLink, TeamComposer } from "@/components/team-messages/team-composer";
import { copy } from "@/config/admin";
import { requireRole } from "@/lib/dal";
import { TEAM_MESSAGE_ROLES } from "@/lib/roles";

export default async function NewTeamMessagePage() {
  const session = await requireRole(...TEAM_MESSAGE_ROLES);
  if (!session.ok) redirect("/");

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-4">
        <ComposerBackLink />
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold">{copy.teamMessages.composer.title}</h1>
          <p className="text-sm text-muted-foreground">{copy.teamMessages.composer.description}</p>
        </div>
        <TeamComposer />
      </div>
    </main>
  );
}
