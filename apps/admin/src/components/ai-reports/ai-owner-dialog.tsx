"use client";

import { AlertTriangle, CalendarDays, Clock, ExternalLink, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { formatWhen } from "@/components/ai-reports/ai-report-format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { copy } from "@/config/admin";
import { useAccountDetail } from "@/hooks/use-users";
import { trustStatusFor } from "@/lib/trust-constants";

const r = copy.aiReports.owner;

/** The trust band, coloured with the same tokens as the queue's own statuses. */
function trustTone(score: number | null) {
  const status = trustStatusFor(score);
  if (status === "permanently_banned" || status === "temporary_banned") {
    return "border-rejected/30 bg-rejected-soft text-rejected-fg";
  }
  if (status === "warning") return "border-waiting/30 bg-waiting-soft text-waiting-fg";
  return "border-approved/30 bg-approved-soft text-approved-fg";
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <div className="flex min-w-0 flex-col">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="truncate text-sm font-medium">{value}</span>
      </div>
    </div>
  );
}

/**
 * The uploader at a glance, without leaving the queue.
 *
 * Opening /users/{id} loses the moderator's place and their half-filled note.
 * This answers the one question the queue raises — "who is this, and have they
 * done it before?" — and links out for anything deeper.
 */
export function AiOwnerDialog({
  accountId,
  email,
  open,
  onOpenChange,
}: {
  accountId: string;
  email: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // Only fetches once opened; a queue page holds 25 of these.
  const account = useAccountDetail(open ? accountId : "");
  const data = account.data;

  const active = (data?.restrictions ?? []).filter((item) => item.liftedAt === null);
  const history = data?.restrictions.length ?? 0;
  const initial = (data?.displayName ?? email ?? "?").trim().charAt(0).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="flex-row items-center gap-3 space-y-0 border-b bg-muted/40 px-6 py-5">
          <span
            aria-hidden="true"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-brand text-lg font-semibold text-white"
          >
            {initial}
          </span>
          <div className="flex min-w-0 flex-col">
            <DialogTitle className="truncate text-base">
              {data?.displayName ?? email ?? r.title}
            </DialogTitle>
            <DialogDescription className="truncate">{email ?? accountId}</DialogDescription>
          </div>
        </DialogHeader>

        <div className="px-6 py-5">
          {account.isPending ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : account.isError ? (
            <p role="alert" className="text-sm text-rejected-fg">
              {account.error.message}
            </p>
          ) : data ? (
            <div className="flex flex-col gap-5">
              {/* The answer to "have they done this before?" goes first. */}
              {active.length > 0 ? (
                <div className="flex items-start gap-2.5 rounded-lg border border-rejected/30 bg-rejected-soft px-3.5 py-3">
                  <AlertTriangle
                    className="mt-0.5 size-4 shrink-0 text-rejected"
                    aria-hidden="true"
                  />
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-semibold text-rejected-fg">
                      {active.map((item) => item.kind).join(", ")}
                    </p>
                    <p className="text-xs text-rejected-fg/80">{active[0]?.reason}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 rounded-lg border border-approved/25 bg-approved-soft px-3.5 py-3">
                  <ShieldCheck className="size-4 shrink-0 text-approved" aria-hidden="true" />
                  <p className="text-sm font-medium text-approved-fg">
                    {history === 0 ? r.clean : `${history} ${r.pastActions}`}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Stat icon={CalendarDays} label={r.joined} value={formatWhen(data.createdAt)} />
                <Stat
                  icon={Clock}
                  label={r.lastSeen}
                  value={data.lastLoginAt ? formatWhen(data.lastLoginAt) : r.never}
                />
              </div>

              {data.pets.length > 0 && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-2.5">
                    <p className="text-xs font-medium text-muted-foreground">
                      {data.pets.length === 1 ? r.onePet : `${data.pets.length} ${r.pets}`}
                    </p>
                    <ul className="flex flex-col gap-2">
                      {data.pets.map((pet) => (
                        <li key={pet.id} className="flex items-center justify-between gap-3">
                          <span className="min-w-0 truncate text-sm">
                            {pet.name ?? pet.id.slice(0, 8)}
                            {pet.species && (
                              <span className="text-muted-foreground"> · {pet.species}</span>
                            )}
                          </span>
                          {pet.trustScore !== null && (
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${trustTone(pet.trustScore)}`}
                            >
                              {r.trust} {pet.trustScore}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>

        {/* mx-0 mb-0 cancels DialogFooter's negative margins, which assume a p-4 parent. */}
        <DialogFooter className="mx-0 mb-0 rounded-none border-t bg-muted/40 px-6 py-4">
          <Button variant="outline" render={<Link href={`/users/${accountId}`} />}>
            <ExternalLink className="size-4" aria-hidden="true" />
            {r.openFull}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
