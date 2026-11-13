"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { QueryErrorCard } from "@/components/shared/query-error-card";
import { TrustCell } from "@/components/trust/trust-cell";
import { ActionDialog } from "@/components/users/action-dialog";
import { RestrictionBadge } from "@/components/users/restriction-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { copy } from "@/config/admin";
import { useAccountAction, useAccountDetail } from "@/hooks/use-users";
import { canAct, type AdminRole, type UserAction } from "@/lib/roles";
import type { AccountDetail } from "@/lib/users-contract";

function formatDateTime(value: string | null): string {
  if (!value) return copy.users.detail.neverActive;
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || copy.dashboard.noData}</dd>
    </div>
  );
}

function AccountActions({ account, role }: { account: AccountDetail; role: AdminRole }) {
  const action = useAccountAction(account.id);
  const isRestricted = account.restriction !== null;

  const can = (key: UserAction) => canAct(role, key);

  async function run(
    kind: "suspend" | "ban" | "restore",
    input: { reason: string; durationHours?: number },
  ) {
    if (kind === "suspend") {
      await action.mutateAsync({
        action: "suspend",
        reason: input.reason,
        durationHours: input.durationHours ?? 168,
      });
    } else {
      await action.mutateAsync({ action: kind, reason: input.reason });
    }
    toast.success(copy.users.toast[kind]);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {can("suspend") && !isRestricted ? (
        <ActionDialog
          action="suspend"
          isPending={action.isPending}
          onConfirm={(input) => run("suspend", input)}
        />
      ) : null}
      {can("ban") && account.restriction?.kind !== "banned" ? (
        <ActionDialog
          action="ban"
          isPending={action.isPending}
          triggerVariant="destructive"
          onConfirm={(input) => run("ban", input)}
        />
      ) : null}
      {can("restore") && isRestricted ? (
        <ActionDialog
          action="restore"
          isPending={action.isPending}
          onConfirm={(input) => run("restore", input)}
        />
      ) : null}
    </div>
  );
}

export function UserDetail({ id, role }: { id: string; role: AdminRole }) {
  const account = useAccountDetail(id);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string } | null>(null);

  if (account.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <ArrowLeft className="size-4" aria-hidden="true" />
            <Skeleton className="h-4 w-28" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <Skeleton className="size-12 rounded-full" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-20" />
                  <Skeleton className="h-5 w-36" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (account.isError) {
    return (
      <QueryErrorCard message={account.error.message} onRetry={() => account.refetch()}>
        <Button variant="ghost" size="sm" render={<Link href="/users" />}>
          {copy.users.detail.back}
        </Button>
      </QueryErrorCard>
    );
  }

  const data = account.data;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit gap-2 px-2"
          render={<Link href="/users" />}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {copy.users.detail.back}
        </Button>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {data.profile?.avatarUrl ? (
              <button
                type="button"
                onClick={() =>
                  setPreviewPhoto({
                    url: data.profile?.avatarUrl ?? "",
                    title: `${data.displayName || data.email || "User"}'s Avatar`,
                  })
                }
                className="group relative size-12 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                title="Click to view full profile photo"
              >
                <img
                  src={data.profile.avatarUrl}
                  alt={data.displayName || "User avatar"}
                  className="size-12 rounded-full border border-border/80 object-cover bg-muted transition-transform group-hover:scale-105"
                />
              </button>
            ) : (
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted text-lg font-semibold text-muted-foreground">
                {(data.displayName || data.email || "U").charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <h1 className="font-display text-2xl font-semibold">
                  {data.displayName || data.email || data.id}
                </h1>
                <RestrictionBadge
                  restriction={data.restriction}
                  status={data.status}
                  deletedAt={data.deletedAt}
                />
              </div>
              {data.displayName && data.email ? (
                <span className="text-xs text-muted-foreground">{data.email}</span>
              ) : null}
            </div>
          </div>
          <AccountActions account={data} role={role} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{copy.users.detail.profile}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Email" value={data.email} />
            <Field label="Phone" value={data.phone} />
            <Field
              label="Email verified"
              value={data.emailVerified ? copy.users.detail.verified : copy.users.detail.unverified}
            />
            <Field label="Name" value={data.profile?.name ?? null} />
            <Field
              label="Location"
              value={
                [data.profile?.city, data.profile?.state, data.profile?.country]
                  .filter(Boolean)
                  .join(", ") || null
              }
            />
            <Field label="Joined" value={formatDateTime(data.createdAt)} />
            <Field label="Last login" value={formatDateTime(data.lastLoginAt)} />
            <Field label="Last active" value={formatDateTime(data.lastActivityAt)} />
            <Field label="Account status" value={data.status} />
          </dl>
          {data.profile?.bio ? (
            <p className="mt-4 text-sm text-muted-foreground">{data.profile.bio}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {copy.users.detail.pets} ({data.pets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.pets.length === 0 ? (
            <p className="text-sm text-muted-foreground">{copy.users.detail.noPets}</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {data.pets.map((pet) => (
                <li key={pet.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex items-center gap-3">
                    {pet.photoUrl ? (
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewPhoto({
                            url: pet.photoUrl ?? "",
                            title: `${pet.name || "Pet"} (${[pet.species, pet.breed].filter(Boolean).join(" · ")})`,
                          })
                        }
                        className="group relative size-10 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        title="Click to view full photo"
                      >
                        <img
                          src={pet.photoUrl}
                          alt={pet.name || "Pet"}
                          className="size-10 rounded-full border border-border/80 object-cover bg-muted transition-transform group-hover:scale-105"
                        />
                      </button>
                    ) : (
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted text-xs font-semibold text-muted-foreground">
                        {pet.name ? pet.name.charAt(0).toUpperCase() : "🐾"}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium">{pet.name || copy.dashboard.noData}</p>
                      <p className="text-xs text-muted-foreground">
                        {[pet.species, pet.breed].filter(Boolean).join(" · ") ||
                          copy.dashboard.noData}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <TrustCell pet={pet} />
                    <RestrictionBadge restriction={pet.restriction} status={pet.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>{copy.users.detail.history}</CardTitle>
          {/* The restriction rows below are current state; the audit log is the
              full record of who did what and why. */}
          <Button
            variant="ghost"
            size="sm"
            render={<Link href={`/audit?targetId=${data.id}`} />}
          >
            {copy.users.viewHistory}
          </Button>
        </CardHeader>
        <CardContent>
          {data.restrictions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{copy.users.detail.noHistory}</p>
          ) : (
            <ul className="flex flex-col divide-y">
              {data.restrictions.map((restriction, index) => (
                <li key={index} className="flex flex-col gap-1 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium capitalize">{restriction.kind}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(restriction.createdAt)}
                    </span>
                    {restriction.liftedAt ? (
                      <span className="text-xs text-muted-foreground">
                        · {copy.users.detail.lifted} {formatDateTime(restriction.liftedAt)}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{restriction.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(previewPhoto)} onOpenChange={(open) => !open && setPreviewPhoto(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{previewPhoto?.title || "Photo"}</DialogTitle>
          </DialogHeader>
          {previewPhoto?.url ? (
            <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-lg bg-muted/40 p-2">
              <img
                src={previewPhoto.url}
                alt={previewPhoto.title}
                className="max-h-[65vh] w-auto max-w-full rounded-md object-contain shadow-sm"
              />
              <div className="mt-3 flex w-full justify-end text-xs">
                <a
                  href={previewPhoto.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Open original ↗
                </a>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
