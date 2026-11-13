import type { AiDecisionSummary } from "@/lib/ai-moderation-contract";

/** One status from three columns: `decision` + `review_status` + `final_decision` were the same question asked twice. */
export const AI_STATUSES = [
  // Three waiting states, not one: a row the AI wants to reject needs a
  // different kind of attention from one it had no opinion on.
  "waiting_ai_approved",
  "waiting_ai_rejected",
  "waiting_ai_unsure",
  "published",
  "blocked",
  "published_by_human",
  "blocked_by_human",
] as const;
export type AiStatus = (typeof AI_STATUSES)[number];

export function deriveStatus(decision: AiDecisionSummary): AiStatus {
  // A human verdict wins over the model's, whatever the model said.
  if (decision.review.status === "done") {
    return decision.review.finalDecision === "APPROVED" ? "published_by_human" : "blocked_by_human";
  }
  if (decision.review.status === "pending") {
    if (decision.decision === "APPROVED") return "waiting_ai_approved";
    if (decision.decision === "REJECTED") return "waiting_ai_rejected";
    return "waiting_ai_unsure";
  }
  return decision.decision === "REJECTED" ? "blocked" : "published";
}

/** True when this row is still a moderator's job. */
export function isActionable(decision: AiDecisionSummary): boolean {
  return decision.review.status === "pending";
}

/** Did the human reverse the model? The interesting case for whoever tunes the next version. */
export function wasOverturned(decision: AiDecisionSummary): boolean {
  if (decision.review.status !== "done" || !decision.review.finalDecision) return false;
  const modelSaidReject = decision.decision === "REJECTED";
  const humanSaidReject = decision.review.finalDecision === "REJECTED";
  // HUMAN_REVIEW was never a verdict, so there is nothing to overturn.
  if (decision.decision === "HUMAN_REVIEW") return false;
  return modelSaidReject !== humanSaidReject;
}
