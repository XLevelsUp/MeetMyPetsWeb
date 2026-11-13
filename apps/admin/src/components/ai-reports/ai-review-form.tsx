"use client";

import { Check, X } from "lucide-react";
import { useId, useState } from "react";

import { Spinner } from "@/components/shared/spinner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { copy } from "@/config/admin";
import { useActionToast } from "@/hooks/use-action-toast";
import { useResolveAiDecision } from "@/hooks/use-ai-reports";
import {
  AI_REJECTION_CODES,
  AI_REJECTION_LABELS,
  wrongReasonsFor,
  type AiRejectionCode,
} from "@/lib/ai-moderation-constants";
import { outcomeFor, type AiDecisionSummary } from "@/lib/ai-moderation-contract";

const t = copy.aiReports.review;

/**
 * The moderator answers one question: was the AI right?
 *
 * The post's outcome follows from that answer and is shown live, never
 * clicked. On a HUMAN_REVIEW row agreeing BLOCKS the post — the AI raised a
 * concern without committing, so confirming it means the concern was real.
 */
export function AiReviewForm({ decision }: { decision: AiDecisionSummary }) {
  const resolve = useResolveAiDecision();
  // One toast covers the whole save: spinner on click, result in its place.
  const action = useActionToast(resolve, {
    loading: t.savingToast,
    success: (result) =>
      result.finalDecision === "APPROVED" ? t.approvedToast : t.rejectedToast,
  });
  const group = useId();

  const [verdict, setVerdict] = useState<"right" | "wrong" | null>(null);
  const [reason, setReason] = useState("");
  const [code, setCode] = useState<AiRejectionCode | "">("");
  const [note, setNote] = useState("");
  // Starts at the AI's own finding; the moderator only touches it to correct one.
  const [isAiGen, setIsAiGen] = useState(decision.aiGenerated ?? false);

  const reasons = wrongReasonsFor(decision.decision);
  const outcome = verdict === null ? null : outcomeFor(decision.decision, verdict === "right");
  const blocksPost = outcome === "REJECTED";

  // A fresh code is only needed when the moderator's answer blocks a post the
  // AI did not already give one for.
  // Agreeing uses the AI's own code; only overturning an approval has none to inherit.
  const needsCode = blocksPost && verdict === "wrong" && !decision.rejectionCode;
  const needsNote = reason === "other";

  const incomplete =
    verdict === null ||
    (verdict === "wrong" && !reason) ||
    (needsCode && !code) ||
    (needsNote && !note.trim());

  const submit = () => {
    if (incomplete) return;
    action.run({
      id: decision.id,
      aiWasRight: verdict === "right",
      wrongReason: verdict === "wrong" ? reason : null,
      finalRejectionCode: needsCode ? (code as AiRejectionCode) : null,
      isAiGenerated: isAiGen,
      remarks: note.trim() || undefined,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-5">
          {(
            [
              ["right", t.aiRight, "accent-[var(--approved)]"],
              ["wrong", t.aiWrong, "accent-[var(--rejected)]"],
            ] as const
          ).map(([value, label, accent]) => (
            <label key={value} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name={group}
                value={value}
                checked={verdict === value}
                onChange={() => {
                  setVerdict(value);
                  // Clear both: a stale value would be submitted invisibly once its field hides.
                  setReason("");
                  setCode("");
                }}
                disabled={resolve.isPending}
                className={`size-4 ${accent}`}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {verdict === "wrong" && (
        <div className="flex flex-col gap-1.5 border-l-2 border-rejected/30 pl-3">
          <label htmlFor={`${group}-reason`} className="text-sm font-medium">
            {t.whyWrong}
          </label>
          <Select
            value={reason}
            onValueChange={(value) => setReason(value ?? "")}
            disabled={resolve.isPending}
          >
            <SelectTrigger id={`${group}-reason`} className="text-left">
              {/* A children function overrides `placeholder`, so handle the empty case here. */}
              <SelectValue>
                {(value: string | null) =>
                  value
                    ? (reasons.find((r) => r.value === value)?.label ?? value)
                    : t.pickReasonPlaceholder
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              align="start"
              className="w-auto min-w-(--anchor-width) max-w-[min(30rem,calc(100vw-2rem))]"
            >
              {reasons.map((item, index) => (
                <SelectItem
                  key={item.value}
                  value={item.value}
                  className={`py-2 *:[span]:last:whitespace-normal ${
                    index > 0 ? "border-t border-border/60" : ""
                  }`}
                >
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {needsCode && (
        <div className="flex flex-col gap-1.5 border-l-2 border-rejected/30 pl-3">
          <label htmlFor={`${group}-code`} className="text-sm font-medium">
            {t.codeLabel}
          </label>
          <Select
            value={code}
            onValueChange={(value) => setCode(value as AiRejectionCode)}
            disabled={resolve.isPending}
          >
            <SelectTrigger id={`${group}-code`} className="text-left">
              <SelectValue>
                {(value: string | null) =>
                  value
                    ? (AI_REJECTION_LABELS[value as AiRejectionCode] ?? value)
                    : t.pickCodePlaceholder
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent
              alignItemWithTrigger={false}
              align="start"
              className="w-auto min-w-(--anchor-width) max-w-[min(30rem,calc(100vw-2rem))]"
            >
              {AI_REJECTION_CODES.map((value, index) => (
                <SelectItem
                  key={value}
                  value={value}
                  title={value}
                  className={`py-2 *:[span]:last:whitespace-normal ${
                    index > 0 ? "border-t border-border/60" : ""
                  }`}
                >
                  {AI_REJECTION_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* States the consequence before the click, since "approve" can block a post. */}
      {outcome && (
        <p className="text-sm">
          {t.outcomePrefix}{" "}
          <span className={blocksPost ? "font-semibold text-rejected-fg" : "font-semibold text-approved-fg"}>
            {blocksPost ? t.outcomeBlocked : t.outcomePublished}
          </span>
        </p>
      )}

      {/* Separate from the verdict: the app reads this to show its own label. */}
      <div className="flex items-center gap-2.5">
        <span className="text-sm font-medium">{t.aiGenLabel}</span>
        <button
          type="button"
          role="switch"
          aria-checked={isAiGen}
          aria-label={t.aiGenLabel}
          onClick={() => setIsAiGen((on) => !on)}
          disabled={resolve.isPending}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50 ${
            isAiGen ? "bg-waiting" : "bg-muted-foreground/35"
          }`}
        >
          <span
            className={`inline-block size-4 rounded-full bg-white shadow transition-transform ${
              isAiGen ? "translate-x-[1.125rem]" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${group}-note`} className="text-sm font-semibold">
          {needsNote ? t.noteRequired : t.noteLabel}
        </label>
        <Textarea
          id={`${group}-note`}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder={t.notePlaceholder}
          maxLength={1000}
          rows={2}
          disabled={resolve.isPending}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button
          onClick={submit}
          disabled={incomplete || resolve.isPending}
          nativeButton
          className={
            blocksPost
              ? "gap-1.5 bg-rejected text-white hover:bg-rejected/90"
              : "gap-1.5 bg-approved text-white hover:bg-approved/90"
          }
        >
          {resolve.isPending ? (
            <Spinner className="text-white" />
          ) : blocksPost ? (
            <X className="size-4" aria-hidden="true" />
          ) : (
            <Check className="size-4" aria-hidden="true" />
          )}
          {resolve.isPending ? t.saving : t.submit}
        </Button>
      </div>
    </div>
  );
}
