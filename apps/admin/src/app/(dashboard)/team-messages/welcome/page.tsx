import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { WelcomeEditor } from "@/components/team-messages/welcome-editor";
import { copy } from "@/config/admin";
import { requireRole } from "@/lib/dal";
import { TEAM_MESSAGE_ROLES } from "@/lib/roles";

export default async function WelcomeMessagesPage() {
  const session = await requireRole(...TEAM_MESSAGE_ROLES);
  if (!session.ok) redirect("/");

  const w = copy.teamMessages.welcome;
  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-4">
        <Link href="/team-messages" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden="true" />
          {w.back}
        </Link>
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold">{w.title}</h1>
          <p className="text-sm text-muted-foreground">{w.description}</p>
        </div>
        <WelcomeEditor />
      </div>
    </main>
  );
}
