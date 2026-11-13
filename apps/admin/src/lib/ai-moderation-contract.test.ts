import { describe, expect, it } from "vitest";

import {
  DEFAULT_AI_QUERY,
  aiDecisionsQuerySchema,
  outcomeFor,
  resolveAiDecisionSchema,
} from "@/lib/ai-moderation-contract";
import {
  AI_DIMENSIONS,
  AI_REASON_LABELS,
  AI_REJECTION_LABELS,
  isPipelineCode,
  reasonCodeLabel,
  shouldShowReason,
  wrongReasonsFor,
} from "@/lib/ai-moderation-constants";

describe("aiDecisionsQuerySchema", () => {
  /** Opening a work queue should show the work, not everything ever checked. */
  it("defaults to the pending queue, newest first", () => {
    expect(DEFAULT_AI_QUERY.review).toBe("needs_review");
    expect(DEFAULT_AI_QUERY.sort).toBe("created_at");
    expect(DEFAULT_AI_QUERY.dir).toBe("desc");
  });

  /** A hand-edited URL must degrade, never 400 a moderator out of the page. */
  it("falls back to the defaults on nonsense input", () => {
    const parsed = aiDecisionsQuerySchema.parse({
      review: "banana",
      decision: "???",
      sort: "drop table",
      dir: "sideways",
      page: -5,
    });
    expect(parsed.review).toBe("needs_review");
    expect(parsed.decision).toBe("all");
    expect(parsed.sort).toBe("created_at");
    expect(parsed.dir).toBe("desc");
    expect(parsed.page).toBe(1);
  });

  it("keeps valid filters", () => {
    const parsed = aiDecisionsQuerySchema.parse({
      review: "approved_by_moderator",
      media: "pet_profile_photo",
    });
    expect(parsed.review).toBe("approved_by_moderator");
    expect(parsed.media).toBe("pet_profile_photo");
  });

  /** Splitting "who decided" from "what they decided" made this pair unaskable. */
  it("can ask for a moderator's approvals and the AI's separately", () => {
    for (const value of [
      "approved_by_moderator",
      "rejected_by_moderator",
      "approved_by_ai",
      "rejected_by_ai",
    ]) {
      expect(aiDecisionsQuerySchema.parse({ review: value }).review).toBe(value);
    }
  });
});

describe("resolveAiDecisionSchema", () => {
  it("accepts agreeing with the AI", () => {
    expect(
      resolveAiDecisionSchema.safeParse({ aiWasRight: true, isAiGenerated: false }).success,
    ).toBe(true);
  });

  /** The app reads this flag, so an omitted value must not silently default. */
  it("requires the AI-generated verdict", () => {
    expect(resolveAiDecisionSchema.safeParse({ aiWasRight: true }).success).toBe(false);
  });

  /** Disagreeing without saying why is the one thing that must never save. */
  it("requires a reason when the AI was wrong", () => {
    expect(resolveAiDecisionSchema.safeParse({ aiWasRight: false, isAiGenerated: false }).success).toBe(false);
    expect(
      resolveAiDecisionSchema.safeParse({ aiWasRight: false, wrongReason: "nothing_wrong", isAiGenerated: false })
        .success,
    ).toBe(true);
  });

  it("requires a note when the reason is Other", () => {
    expect(
      resolveAiDecisionSchema.safeParse({ aiWasRight: false, wrongReason: "other", isAiGenerated: false }).success,
    ).toBe(false);
    expect(
      resolveAiDecisionSchema.safeParse({
        aiWasRight: false,
        wrongReason: "other",
        isAiGenerated: false,
        remarks: "the dog was wet from a bath",
      }).success,
    ).toBe(true);
  });

  /** decisions_remarks_length_check caps this at 1000 characters. */
  it("rejects remarks longer than the column allows", () => {
    expect(
      resolveAiDecisionSchema.safeParse({ aiWasRight: true, isAiGenerated: false, remarks: "x".repeat(1001) }).success,
    ).toBe(false);
  });
});

describe("outcomeFor", () => {
  /**
   * The table the product owner confirmed on 2026-11-13. The HUMAN_REVIEW row
   * is the counter-intuitive one: agreeing with an unsure AI BLOCKS the post,
   * because the concern it raised turned out to be real.
   */
  it.each([
    ["APPROVED", true, "APPROVED"],
    ["APPROVED", false, "REJECTED"],
    ["REJECTED", true, "REJECTED"],
    ["REJECTED", false, "APPROVED"],
    ["HUMAN_REVIEW", true, "REJECTED"],
    ["HUMAN_REVIEW", false, "APPROVED"],
  ] as const)("AI %s + right=%s -> %s", (ai, right, expected) => {
    expect(outcomeFor(ai, right)).toBe(expected);
  });
});

describe("wrongReasonsFor", () => {
  /** Three lists: "wrong" means something different for each AI verdict. */
  it("offers missed-something reasons when the AI approved", () => {
    const values = wrongReasonsFor("APPROVED").map((r) => r.value);
    expect(values).toContain("missed_welfare_abuse");
    expect(values).not.toContain("nothing_wrong");
  });

  it("offers over-flagged reasons when the AI rejected", () => {
    const values = wrongReasonsFor("REJECTED").map((r) => r.value);
    expect(values).toContain("nothing_wrong");
    expect(values).toContain("wrong_code");
    expect(values).not.toContain("missed_welfare_abuse");
  });

  /** No verdict means no code to have got wrong. */
  it("drops the wrong-code option when the AI was unsure", () => {
    expect(wrongReasonsFor("HUMAN_REVIEW").map((r) => r.value)).not.toContain("wrong_code");
  });

  it("always offers Other", () => {
    for (const ai of ["APPROVED", "REJECTED", "HUMAN_REVIEW"] as const) {
      expect(wrongReasonsFor(ai).map((r) => r.value)).toContain("other");
    }
  });
});

describe("reasonCodeLabel", () => {
  it("uses the written label when there is one", () => {
    expect(reasonCodeLabel("welfare_abuse")).toBe("The animal may be being hurt");
  });

  /** The model may emit a code this build has never seen; blank is worse than ugly. */
  it("humanises an unknown code rather than rendering nothing", () => {
    expect(reasonCodeLabel("some_new_code")).toBe("Some new code");
  });
});

describe("isPipelineCode", () => {
  it("treats pipeline chatter as noise", () => {
    expect(isPipelineCode("validation_passed")).toBe(true);
    expect(isPipelineCode("gate2_review")).toBe(true);
  });

  /** A real finding must never be filtered out of the moderator's view. */
  it("keeps content findings", () => {
    expect(isPipelineCode("welfare_abuse")).toBe(false);
    expect(isPipelineCode("no_pet_detected")).toBe(false);
  });
});

describe("shouldShowReason", () => {
  /** Internal stage names must never reach a moderator, labelled or not. */
  it("hides the model's own pipeline stages", () => {
    expect(shouldShowReason("validation_passed")).toBe(false);
    expect(shouldShowReason("gate2_review")).toBe(false);
    expect(shouldShowReason("gate3_something_new")).toBe(false);
    expect(shouldShowReason("d4_experimental")).toBe(false);
  });

  /** A real finding must never be filtered out, including ones we have no wording for. */
  it("keeps findings about the content", () => {
    expect(shouldShowReason("welfare_abuse")).toBe(true);
    expect(shouldShowReason("no_pet_detected")).toBe(true);
    expect(shouldShowReason("some_future_finding")).toBe(true);
  });
});

describe("plain language", () => {
  /**
   * The panel is read by moderators, not engineers. This fails the build if a
   * raw code, an internal stage name or an acronym reaches a visible string.
   */
  const JARGON = /\b(gate\s*\d|NSFW|composite|pipeline|validation|zero-shot|D[1-6]_|MOD_\d|schema|null|boolean)\b/i;

  it("keeps jargon out of the reason labels", () => {
    for (const [code, label] of Object.entries(AI_REASON_LABELS)) {
      expect(label, `${code} → "${label}"`).not.toMatch(JARGON);
    }
  });

  it("keeps jargon out of the rejection reasons", () => {
    for (const [code, label] of Object.entries(AI_REJECTION_LABELS)) {
      expect(label, `${code} → "${label}"`).not.toMatch(JARGON);
    }
  });

  it("keeps jargon out of the score names", () => {
    for (const { key, label } of AI_DIMENSIONS) {
      expect(label, `${key} → "${label}"`).not.toMatch(JARGON);
    }
  });

  /** Every label a moderator reads should start like a sentence, not a key. */
  it("writes labels as words, not identifiers", () => {
    for (const label of Object.values(AI_REASON_LABELS)) {
      expect(label).not.toMatch(/_/);
      expect(label[0]).toBe(label[0]?.toUpperCase());
    }
  });
});
