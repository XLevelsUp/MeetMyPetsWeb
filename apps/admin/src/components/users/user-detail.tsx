"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { QueryErrorCard } from "@/components/shared/query-error-card";
import { ActionDialog } from "@/components/users/action-dialog";
import { RestrictionBadge } from "@/components/users/restriction-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { copy } from "@/config/admin";
import { useAccountAction, useAccountDetail } from "@/hooks/use-users";
import type { AdminRole } from "@/lib/roles";
import { USER_ACTION_ROLES } from "@/lib/roles";
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

  // Mirrors USER_ACTION_ROLES; the API enforces the same map independently, so
  // hiding a button is a UX affordance, not the security boundary.
  const can = (key: keyof typeof USER_ACTION_ROLES) => USER_ACTION_ROLES[key].includes(role);

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

  if (account.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
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
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-semibold">
              {data.displayName || data.email || data.id}
            </h1>
            <RestrictionBadge restriction={data.restriction} status={data.status} />
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
                  <div>
                    <p className="text-sm font-medium">{pet.name || copy.dashboard.noData}</p>
                    <p className="text-xs text-muted-foreground">
                      {[pet.species, pet.breed].filter(Boolean).join(" · ") ||
                        copy.dashboard.noData}
                    </p>
                  </div>
                  <RestrictionBadge restriction={pet.restriction} status={pet.status} />
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
    </div>
  );
}
