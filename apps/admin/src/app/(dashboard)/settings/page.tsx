import { TriangleAlert } from "lucide-react";
import { redirect } from "next/navigation";

import { SettingsTabs } from "@/components/settings/settings-tabs";
import { copy } from "@/config/admin";
import { requireRole } from "@/lib/dal";
import { SETTINGS_ROLES } from "@/lib/roles";

/**
 * Platform taxonomy management. Super-admin only — stricter than the
 * moderation queues, because an edit here changes the mobile app's pet-creation
 * form for every user rather than acting on one person's content.
 */
export default async function SettingsPage() {
  const session = await requireRole(...SETTINGS_ROLES);
  if (!session.ok) redirect("/");

  return (
    <main className="flex-1 p-4 md:p-6">
      <div className="mx-auto flex w-full max-w-screen-2xl flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold">{copy.settings.title}</h1>
          <p className="text-sm text-muted-foreground">{copy.settings.description}</p>
        </div>

        {/* There is no staging step between this screen and production. */}
        <div
          role="note"
          className="flex items-start gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{copy.settings.liveWarning}</span>
        </div>

        <SettingsTabs />
      </div>
    </main>
  );
}
