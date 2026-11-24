"use client";

import { Check, CircleAlert, Info, PawPrint, UserRound, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Spinner } from "@/components/shared/spinner";
import { useUnsavedChanges } from "@/components/providers/dialog-provider";
import { InlineError } from "@/components/team-messages/inline-error";
import { countOf, fill, formatDateTime, TeamStateBadge, ToneIcon, type Tone } from "@/components/team-messages/team-format";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { copy } from "@/config/admin";
import { useWelcomeAction, useWelcomes } from "@/hooks/use-team-messages";
import { reasonSchema } from "@/lib/contract-shared";
import { isAdminRole, ROLE_LABELS } from "@/lib/roles";
import {
  PLACEHOLDERS,
  TEAM_REASON_MAX,
  WELCOME_BODY_MAX,
  WELCOME_KINDS,
  welcomeProblems,
  type WelcomeKind,
} from "@/lib/team-messages-constants";
import type { TeamMessage } from "@/lib/team-messages-contract";

const w = copy.teamMessages.welcome;

// Same hues as everywhere else: indigo = people, sky = pets.
const KIND_TONES: Record<WelcomeKind, Tone> = {
  welcome: {
    icon: UserRound,
    chip: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300",
    active: "",
  },
  pet_welcome: {
    icon: PawPrint,
    chip: "bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300",
    active: "",
  },
};

const authorLabel = (m: TeamMessage) => {
  if (!m.createdByEmail) return null;
  const role = m.createdByRole && isAdminRole(m.createdByRole) ? ` (${ROLE_LABELS[m.createdByRole]})` : "";
  return `${m.createdByEmail}${role}`;
};

// Preview with the placeholders swapped for sample names, highlighted so staff see exactly what gets filled in.
function PreviewText({ body }: { body: string }) {
  const parts = body.split(/(\{user_name\}|\{pet_name\})/g);
  return (
    <>
      {parts.map((part, i) =>
        part === PLACEHOLDERS.userName || part === PLACEHOLDERS.petName ? (
          <mark key={i} className="rounded bg-amber-100 px-0.5 text-inherit dark:bg-amber-900/60">
            {part === PLACEHOLDERS.userName ? w.sampleUser : w.samplePet}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function CheckLine({ ok, text }: { ok: boolean; text: string }) {
  return (
    <li className={`flex items-center gap-1.5 text-xs ${ok ? "text-emerald-700 dark:text-emerald-400" : "text-destructive"}`}>
      {ok ? <Check className="size-3.5" aria-hidden="true" /> : <X className="size-3.5" aria-hidden="true" />}
      {text}
    </li>
  );
}

function WelcomeCard({ kind, active }: { kind: WelcomeKind; active: TeamMessage | null }) {
  const current = active?.body ?? "";
  const [draft, setDraft] = useState(current);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState<"save" | "stop" | null>(null);
  const [stopReason, setStopReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const action = useWelcomeAction();

  const info = w.kinds[kind];
  const problems = welcomeProblems(kind, draft);
  const dirty = draft !== current;
  const canSave = dirty && problems.length === 0;
  useUnsavedChanges(dirty);
  const stopCheck = reasonSchema.safeParse(stopReason);

  // Insert at the caret, then put the caret after the placeholder so typing can continue.
  function insert(token: string) {
    const el = area.current;
    const start = el?.selectionStart ?? draft.length;
    const end = el?.selectionEnd ?? draft.length;
    const next = `${draft.slice(0, start)}${token}${draft.slice(end)}`;
    if (next.length > WELCOME_BODY_MAX) return;
    setDraft(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  async function run(kindOfAction: "save" | "stop") {
    setError(null);
    try {
      if (kindOfAction === "save") {
        await action.mutateAsync({ action: "set", kind, body: draft, reason: reason.trim() || undefined });
        toast.success(w.toast.saved, { description: w.toast.savedDetail[kind], duration: 7000 });
        setReason("");
      } else {
        await action.mutateAsync({ action: "stop", kind, reason: stopReason.trim() });
        toast.success(w.toast.stopped, { description: w.toast.stoppedDetail[kind], duration: 7000 });
        setStopReason("");
        setDraft("");
      }
      setConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.teamMessages.errors.unknown);
      setConfirm(null);
    }
  }

  const reached = active ? (kind === "welcome" ? countOf(active.accounts, "person") : countOf(active.pets, "pet")) : null;
  const author = active ? authorLabel(active) : null;
  const kindName = info.title.toLowerCase();

  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col gap-4 pt-5">
        <div className="flex items-start gap-3">
          <ToneIcon tone={KIND_TONES[kind]} />
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-base font-semibold">{info.title}</h2>
            <p className="text-xs text-muted-foreground">{info.hint}</p>
          </div>
          {active ? (
            <TeamStateBadge state="active" />
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300">
              <CircleAlert className="size-3.5" aria-hidden="true" />
              {w.stopped}
            </span>
          )}
        </div>

        {active ? (
          <p className="text-xs text-muted-foreground">
            {fill(w.stats, { reached: reached ?? "", read: active.readCount })}
            <br />
            {author ? fill(w.lastBy, { who: author, when: formatDateTime(active.createdAt) }) : w.original}
          </p>
        ) : (
          <p className="rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
            {w.stoppedNote[kind]}
          </p>
        )}

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor={`welcome-${kind}`}>{w.textLabel}</Label>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">{w.insert}</span>
              <Button type="button" size="sm" variant="outline" className="h-7 font-mono text-xs" onClick={() => insert(PLACEHOLDERS.userName)} title={w.placeholderNames.user_name}>
                {PLACEHOLDERS.userName}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 font-mono text-xs"
                disabled={kind === "welcome"}
                onClick={() => insert(PLACEHOLDERS.petName)}
                title={kind === "welcome" ? w.petNotAllowedHint : w.placeholderNames.pet_name}
              >
                {PLACEHOLDERS.petName}
              </Button>
            </div>
          </div>
          <Textarea
            id={`welcome-${kind}`}
            ref={area}
            rows={5}
            value={draft}
            maxLength={WELCOME_BODY_MAX}
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className="flex flex-wrap items-start justify-between gap-2">
            <ul className="flex flex-col gap-0.5">
              <CheckLine ok={!problems.includes("user_name_missing")} text={w.checks.user_name} />
              {kind === "pet_welcome" ? (
                <CheckLine ok={!problems.includes("pet_name_missing")} text={w.checks.pet_name} />
              ) : (
                <CheckLine ok={!problems.includes("pet_name_not_allowed")} text={w.checks.no_pet} />
              )}
            </ul>
            <span className="text-xs text-muted-foreground tabular-nums">
              {fill(copy.teamMessages.actions.counter, { count: draft.length, max: WELCOME_BODY_MAX })}
            </span>
          </div>
        </div>

        {draft.trim() ? (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">{w.preview}</span>
            <div className="rounded-xl bg-muted/50 p-3">
              <div className="max-w-[92%] rounded-2xl rounded-tl-md bg-background px-3 py-2 text-sm leading-snug break-words whitespace-pre-wrap shadow-xs">
                <PreviewText body={draft} />
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`welcome-reason-${kind}`} className="text-xs">
            {w.reasonLabel}
          </Label>
          <Input
            id={`welcome-reason-${kind}`}
            value={reason}
            maxLength={TEAM_REASON_MAX}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>

        {error ? <InlineError message={error} onRetry={() => setError(null)} /> : null}

        <div className="mt-auto flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="outline" className="text-destructive" disabled={!active || action.isPending} onClick={() => setConfirm("stop")}>
            {w.stop}
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            {dirty ? (
              <Button type="button" variant="ghost" disabled={action.isPending} onClick={() => setDraft(current)}>
                {w.undo}
              </Button>
            ) : null}
            <Button type="button" disabled={!canSave || action.isPending} onClick={() => setConfirm("save")}>
              {action.isPending ? <Spinner size="sm" className="mr-1.5" /> : null}
              {action.isPending ? w.saving : w.save}
            </Button>
          </div>
        </div>
      </CardContent>

      {confirm ? (
        <AlertDialog open onOpenChange={(open) => (open ? null : setConfirm(null))}>
          <AlertDialogContent className="data-[size=default]:sm:max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>
                {fill(confirm === "save" ? w.confirmSave.title : w.confirmStop.title, { kind: kindName })}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirm === "save"
                  ? fill(w.confirmSave.description, { who: w.whoNext[kind] })
                  : fill(w.confirmStop.description, { who: w.whoPlural[kind] })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {confirm === "save" ? (
              <div className="max-h-48 overflow-y-auto rounded-xl bg-muted/50 p-3 text-sm break-words whitespace-pre-wrap">
                <PreviewText body={draft} />
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`welcome-stop-${kind}`}>{copy.teamMessages.actions.reasonLabel}</Label>
                <Textarea
                  id={`welcome-stop-${kind}`}
                  rows={2}
                  value={stopReason}
                  onChange={(event) => setStopReason(event.target.value)}
                  placeholder={copy.teamMessages.actions.reasonPlaceholder}
                />
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={action.isPending}>{copy.teamMessages.actions.back}</AlertDialogCancel>
              <AlertDialogAction
                variant={confirm === "stop" ? "destructive" : "default"}
                disabled={action.isPending || (confirm === "stop" && !stopCheck.success)}
                onClick={() => void run(confirm)}
              >
                {action.isPending ? <Spinner size="sm" className="mr-1.5" /> : null}
                {action.isPending ? w.saving : confirm === "save" ? w.confirmSave.confirm : w.confirmStop.confirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </Card>
  );
}

function History({ versions }: { versions: TeamMessage[] }) {
  const h = w.history;
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="font-heading text-lg font-semibold">{h.title}</h2>
        <p className="text-sm text-muted-foreground">{h.hint}</p>
      </div>
      {versions.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{h.empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {versions.map((v) => {
            const kind = (v.kind === "pet_welcome" ? "pet_welcome" : "welcome") as WelcomeKind;
            const author = authorLabel(v);
            return (
              <li key={v.id} className="flex min-w-0 gap-3 rounded-lg border p-3">
                <ToneIcon tone={KIND_TONES[kind]} size="sm" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{w.kinds[kind].title}</span>
                    <TeamStateBadge state={v.state} />
                    <span className="text-xs text-muted-foreground">{formatDateTime(v.createdAt)}</span>
                  </div>
                  <p className="line-clamp-3 text-sm break-words whitespace-pre-wrap text-muted-foreground">{v.body}</p>
                  <p className="text-xs text-muted-foreground">
                    {author ? fill(h.by, { who: author }) : h.system} ·{" "}
                    {fill(w.stats, {
                      reached: kind === "welcome" ? countOf(v.accounts, "person") : countOf(v.pets, "pet"),
                      read: v.readCount,
                    })}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function WelcomeEditor() {
  const welcomes = useWelcomes();

  if (welcomes.isPending) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  if (welcomes.isError) return <InlineError message={welcomes.error.message} onRetry={() => void welcomes.refetch()} />;

  return (
    <div className="flex flex-col gap-6">
      <p className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50/70 px-4 py-3 text-sm text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-200">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {w.note}
      </p>
      <p className="text-xs text-muted-foreground">{w.placeholderHint}</p>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {WELCOME_KINDS.map((kind) => (
          // Keyed on the active version so a save or stop resets the card to the new server state.
          <WelcomeCard key={`${kind}-${welcomes.data.active[kind]?.id ?? "stopped"}`} kind={kind} active={welcomes.data.active[kind]} />
        ))}
      </div>
      <History versions={welcomes.data.retired} />
    </div>
  );
}
