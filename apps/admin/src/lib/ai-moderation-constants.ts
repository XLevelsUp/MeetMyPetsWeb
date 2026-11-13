/** Mirrors the CHECK constraints on `moderation.decisions` — not ours to extend without a migration. */

/** The model's verdict. `decisions_decision_check` — uppercase on purpose. */
export const AI_DECISIONS = ["APPROVED", "HUMAN_REVIEW", "REJECTED"] as const;
export type AiDecision = (typeof AI_DECISIONS)[number];

/** Human-review state. */
export const AI_REVIEW_STATUSES = ["pending", "done"] as const;
export type AiReviewStatus = (typeof AI_REVIEW_STATUSES)[number];

/** What a moderator may resolve a decision *to*. No third option by design. */
export const AI_FINAL_DECISIONS = ["APPROVED", "REJECTED"] as const;
export type AiFinalDecision = (typeof AI_FINAL_DECISIONS)[number];

/** Breed verification. Always `not_checked` until that model ships. */
export const AI_BREED_STATUSES = ["matched", "unmatched", "not_checked"] as const;
export type AiBreedStatus = (typeof AI_BREED_STATUSES)[number];

/** Where the media lives. Drives which table an approval writes back to. */
export const AI_MEDIA_TYPES = ["pet_media", "post_media", "pet_profile_photo"] as const;
export type AiMediaType = (typeof AI_MEDIA_TYPES)[number];

export const AI_CONTENT_TYPES = ["image", "video"] as const;
export type AiContentType = (typeof AI_CONTENT_TYPES)[number];

/** Rejection codes, from the AI team's spec §5.2. Every rejected item carries exactly one. */
export const AI_REJECTION_CODES = [
  "MOD_001",
  "MOD_002",
  "MOD_003",
  "MOD_004",
  "MOD_005",
  "MOD_006",
  "MOD_007",
  "MOD_008",
  "MOD_009",
] as const;
export type AiRejectionCode = (typeof AI_REJECTION_CODES)[number];

/** Spec §5.2 verbatim. A moderator picking a rejection reason reads these. */
export const AI_REJECTION_LABELS: Record<AiRejectionCode, string> = {
  MOD_001: "There is no pet in this",
  MOD_002: "The animal is being hurt or mistreated",
  MOD_003: "Animals made to fight",
  MOD_004: "Sexual or adult content",
  MOD_005: "Violence or graphic injury",
  MOD_006: "Weapons or drugs",
  MOD_007: "Too poor quality to publish",
  MOD_008: "The file is broken or the wrong type",
  MOD_009: "Buying or selling wild animals",
};

/** Short forms for the table, where the full sentence will not fit. */
export const AI_REJECTION_SHORT: Record<AiRejectionCode, string> = {
  MOD_001: "No pet",
  MOD_002: "Mistreatment",
  MOD_003: "Fighting",
  MOD_004: "Adult content",
  MOD_005: "Violence",
  MOD_006: "Weapons or drugs",
  MOD_007: "Poor quality",
  MOD_008: "Broken file",
  MOD_009: "Wildlife trade",
};

/** The six scoring dimensions inside `dimension_scores`, in spec order. */
export const AI_DIMENSIONS = [
  { key: "D1_welfare", label: "Animal wellbeing" },
  { key: "D2_nsfw", label: "Adult content" },
  { key: "D3_violence", label: "Violence" },
  { key: "D4_prohibited", label: "Banned items" },
  { key: "D5_quality", label: "Picture quality" },
  { key: "D6_relevance", label: "Fits the app" },
] as const;

/** Reason codes seen in the model's output, grouped by what they mean. */
export const AI_REASON_LABELS: Record<string, string> = {
  // Welfare
  welfare_abuse: "The animal may be being hurt",
  welfare_distress: "The animal looks distressed",
  welfare_neglect: "The animal may be neglected",
  guard_concern_welfare: "Something about the animal looks wrong",
  // Is it a pet?
  no_pet_detected: "No animal in the picture",
  wild_context: "Looks like a wild animal",
  species_mismatch: "Not the animal the owner said",
  gate1_borderline: "Not sure this is a real pet",
  gate1_head_doubt: "Can't see the animal clearly",
  // What else is in the picture
  violence_animal_aggression: "Animals fighting",
  audio_distress: "Distressing sounds",
  item_alcohol: "Alcohol in the picture",
  guard_concern_items: "Something concerning in the picture",
  // Picture itself
  low_composite: "Poor quality overall",
  check_incomplete: "The check didn't finish",
  corrupt_file: "The file is damaged",
  quarantined: "Flagged by the virus scanner",
};

/** Codes naming a stage of the model's own pipeline, not a finding about the content. */
const PIPELINE_CODES = new Set([
  "validation_passed",
  "gate1_passed",
  "gate2_review",
  "d1_d3_zero_shot",
]);

/** True when a code is pipeline noise, not a reason a human should weigh. */
export function isPipelineCode(code: string): boolean {
  return PIPELINE_CODES.has(code);
}

/**
 * Plain-English label for a reason code.
 *
 * An unknown code is humanised rather than dropped — a finding this build has
 * no wording for must still reach the moderator — but internal stage names
 * (`gate1_`, `gate2_`, `d1_`) are suppressed, because a raw pipeline term on
 * screen is worse than nothing. `shouldShowReason` is what callers filter on.
 */
export function reasonCodeLabel(code: string): string {
  return AI_REASON_LABELS[code] ?? code.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

/** A code only reaches the UI if it has wording or reads as plain language. */
export function shouldShowReason(code: string): boolean {
  if (isPipelineCode(code)) return false;
  if (AI_REASON_LABELS[code]) return true;
  // Unlabelled internals leak the engineer's stage names; keep them off screen.
  return !/^(gate\d|d\d_|stage|pipeline)/i.test(code);
}

/* -------------------------------------------------------------------------
 * Why the AI was wrong
 *
 * Three lists, because "wrong" means something different depending on what the
 * AI said. These are retraining signal: they go into `incorrect_reason_codes`
 * (the AI over-flagged) or `missing_reason_codes` (the AI under-flagged).
 * ---------------------------------------------------------------------- */

export type WrongReason = { value: string; label: string };

/** The AI let it through but should not have — it MISSED something. */
export const WRONG_WHEN_AI_APPROVED: readonly WrongReason[] = [
  { value: "missed_no_pet", label: "Missed: no pet in the image or video" },
  { value: "missed_welfare_abuse", label: "Missed: animal being hurt or mistreated" },
  { value: "missed_welfare_fighting", label: "Missed: animals made to fight" },
  { value: "missed_nsfw", label: "Missed: sexual or adult content" },
  { value: "missed_violence", label: "Missed: violence or graphic injury" },
  { value: "missed_prohibited", label: "Missed: weapons or drugs" },
  { value: "missed_wildlife", label: "Missed: buying or selling wild animals" },
  { value: "other", label: "Other (write a note)" },
];

/** The AI blocked it but should not have — it OVER-flagged something innocent. */
export const WRONG_WHEN_AI_REJECTED: readonly WrongReason[] = [
  { value: "is_real_pet", label: "A real pet, or an allowed drawing of one" },
  { value: "normal_care", label: "Normal care: vet, grooming, feeding, rescue or memorial" },
  { value: "is_play", label: "Play, not fighting or aggression" },
  { value: "is_prop", label: "A toy or prop, not a real weapon or drug" },
  { value: "not_sexual", label: "Not sexual" },
  { value: "nothing_wrong", label: "Nothing wrong" },
  { value: "wrong_code", label: "Right to reject, wrong code" },
  { value: "other", label: "Other (write a note)" },
];

/** The AI raised a concern but did not commit. Same over-flagging list, minus the code case. */
export const WRONG_WHEN_AI_UNSURE: readonly WrongReason[] = WRONG_WHEN_AI_REJECTED.filter(
  (reason) => reason.value !== "wrong_code",
);

/** Which list to show, from the AI's own verdict. */
export function wrongReasonsFor(decision: AiDecision): readonly WrongReason[] {
  if (decision === "APPROVED") return WRONG_WHEN_AI_APPROVED;
  if (decision === "REJECTED") return WRONG_WHEN_AI_REJECTED;
  return WRONG_WHEN_AI_UNSURE;
}

/** Every value any list can produce — the contract validates against this. */
export const ALL_WRONG_REASONS: readonly string[] = [
  ...new Set([...WRONG_WHEN_AI_APPROVED, ...WRONG_WHEN_AI_REJECTED].map((r) => r.value)),
];
