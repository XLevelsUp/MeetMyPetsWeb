"use client";

import { CalendarClock, Lock, Send } from "lucide-react";

import { Spinner } from "@/components/shared/spinner";
import { ReachSummary } from "@/components/team-messages/reach-summary";
import { RecipientsBlock, type RecipientPlan } from "@/components/team-messages/recipients-preview";
import { AUDIENCE_TONES, ToneIcon, WHEN_TONES, fill, splitDateTime } from "@/components/team-messages/team-format";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { copy } from "@/config/admin";
import type { TeamAudience } from "@/lib/team-messages-constants";
import type { AudienceCounts } from "@/lib/team-messages-contract";

const text = copy.teamMessages;
const c = text.composer;
const r = c.reviewCard;

const WEEKDAY = new Intl.DateTimeFormat("en-IN", { weekday: "short" });
const RELATIVE = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

// "in 3 hours", "tomorrow", "in 5 days" — the countdown staff actually reason about.
export function relativeFrom(iso: string, now = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  const minutes = Math.round(diff / 60_000);
  if (Math.abs(minutes) < 1) return r.justNow;
  if (Math.abs(minutes) < 60) return RELATIVE.format(minutes, "minute");
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return RELATIVE.format(hours, "hour");
  return RELATIVE.format(Math.round(hours / 24), "day");
}

// One labelled row of the summary; label column on the left from sm up, stacked on phones.
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1.5 py-3.5 sm:grid-cols-[6.5rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase sm:pt-0.5">{label}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  );
}

// A small phone-chat mock of the pinned, read-only MeetMyPets Team conversation.
function ChatPreview({ body, time }: { body: string; time: string }) {
  return (
    <div className="mx-auto w-full max-w-[17rem] overflow-hidden rounded-[1.6rem] border-[6px] border-foreground/85 bg-background shadow-lg dark:border-foreground/30">
      <div className="flex items-center gap-2 border-b px-3 py-2.5">
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground"
          aria-hidden="true"
        >
          MMP
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs leading-tight font-semibold">{r.teamName}</p>
          <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Lock className="size-2.5" aria-hidden="true" />
            {r.pinned}
          </p>
        </div>
      </div>
      <div className="flex min-h-40 flex-col justify-end bg-muted/40 px-2.5 py-3">
        <div className="max-h-56 max-w-[90%] overflow-y-auto rounded-2xl rounded-tl-md bg-background px-3 py-2 text-[13px] leading-snug break-words whitespace-pre-wrap shadow-xs">
          {body}
        </div>
        <p className="mt-1 pl-1 text-[10px] text-muted-foreground">{time}</p>
      </div>
      <div className="flex items-center gap-1.5 border-t px-3 py-2 text-[10px] text-muted-foreground">
        <Lock className="size-3" aria-hidden="true" />
        {r.repliesOff}
      </div>
    </div>
  );
}

export function SendConfirmDialog({
  mode,
  sendAtIso,
  audience,
  audienceDetail,
  recipientPlan,
  counts,
  body,
  reason,
  error,
  pending,
  onConfirm,
  onClose,
}: {
  mode: "now" | "later";
  sendAtIso: string | null;
  audience: TeamAudience;
  audienceDetail: string | null;
  recipientPlan: RecipientPlan;
  counts: AudienceCounts;
  body: string;
  reason: string;
  error: string | null;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const later = mode === "later";
  const parts = later ? splitDateTime(sendAtIso) : null;
  const ModeIcon = later ? CalendarClock : Send;

  return (
    <AlertDialog open onOpenChange={(open) => (open ? null : onClose())}>
      {/* The base dialog caps width at sm:max-w-sm via data-[size=default]; override that exact variant or nothing changes. */}
      <AlertDialogContent className="flex max-h-[92svh] flex-col gap-0 overflow-hidden p-0 data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-[min(48rem,calc(100%-3rem))]">
        <header className="flex items-start gap-3 border-b px-5 py-4 sm:px-6">
          <ToneIcon tone={WHEN_TONES[mode]} />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              {later ? r.eyebrowLater : r.eyebrowNow}
            </p>
            <AlertDialogTitle className="mt-0.5 text-lg">
              {later ? c.scheduleConfirm.title : c.confirm.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-1 text-xs">
              {later ? fill(c.scheduleConfirm.description, { time: `${parts?.date}, ${parts?.time}` }) : c.confirm.description}
            </AlertDialogDescription>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[minmax(0,1fr)_19rem] md:overflow-hidden">
          <dl className="divide-y px-5 sm:px-6 md:overflow-y-auto">
            <Row label={r.when}>
              {later && parts && sendAtIso ? (
                <div className="flex flex-col">
                  <span className="font-semibold">
                    {WEEKDAY.format(new Date(sendAtIso))}, {parts.date} · {parts.time}
                  </span>
                  <span className="text-xs text-sky-700 dark:text-sky-300">{relativeFrom(sendAtIso)}</span>
                </div>
              ) : (
                <div className="flex flex-col">
                  <span className="font-semibold">{r.now}</span>
                  <span className="text-xs text-muted-foreground">{r.nowHint}</span>
                </div>
              )}
            </Row>
            <Row label={r.who}>
              <div className="flex min-w-0 items-start gap-2.5">
                <ToneIcon tone={AUDIENCE_TONES[audience]} size="sm" />
                <div className="min-w-0">
                  <p className="font-semibold">{text.audiences[audience]}</p>
                  {audienceDetail ? (
                    <p className="line-clamp-2 text-xs break-words text-muted-foreground">{audienceDetail}</p>
                  ) : null}
                </div>
              </div>
            </Row>
            <Row label={r.reach}>
              <div className="flex flex-col gap-3">
                <ReachSummary counts={counts} />
                {later ? <p className="text-[11px] text-muted-foreground">{c.scheduleConfirm.estimate}</p> : null}
                <RecipientsBlock plan={recipientPlan} />
              </div>
            </Row>
            <Row label={r.reason}>
              <span className={reason.trim() ? "" : "text-muted-foreground"}>{reason.trim() || r.defaultReason}</span>
            </Row>
          </dl>

          <aside className="flex flex-col gap-3 border-t bg-muted/40 px-5 py-5 md:border-t-0 md:border-l">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{r.preview}</p>
            <ChatPreview body={body} time={later && parts ? parts.time : r.justNow} />
          </aside>
        </div>

        {error ? (
          <p role="alert" className="border-t border-destructive/30 bg-destructive/5 px-5 py-2.5 text-sm text-destructive sm:px-6">
            {error}
          </p>
        ) : null}

        <footer className="flex flex-col-reverse gap-3 border-t bg-muted/30 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-[11px] text-muted-foreground">{r.footNote}</p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <AlertDialogCancel disabled={pending}>{c.confirm.back}</AlertDialogCancel>
            <AlertDialogAction disabled={pending} onClick={onConfirm}>
              {pending ? <Spinner size="sm" className="mr-1.5" /> : <ModeIcon className="mr-1.5 size-4" aria-hidden="true" />}
              {later
                ? pending
                  ? c.scheduleConfirm.sending
                  : c.scheduleConfirm.send
                : pending
                  ? c.confirm.sending
                  : c.confirm.send}
            </AlertDialogAction>
          </div>
        </footer>
      </AlertDialogContent>
    </AlertDialog>
  );
}
