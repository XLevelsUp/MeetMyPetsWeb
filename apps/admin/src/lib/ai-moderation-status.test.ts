import { describe, expect, it } from "vitest";

import { copy } from "@/config/admin";
import { AI_REJECTION_CODES, AI_REJECTION_LABELS } from "@/lib/ai-moderation-constants";
import type { AiDecisionSummary } from "@/lib/ai-moderation-contract";
import { AI_STATUSES, deriveStatus, isActionable, wasOverturned } from "@/lib/ai-moderation-status";

/** Only the three columns deriveStatus reads matter; the rest is filler. */
function decision(
  partial: Partial<Pick<AiDecisionSummary, "decision">> & {
    reviewStatus?: "pending" | "done" | null;
    finalDecision?: "APPROVED" | "REJECTED" | null;
  },
): AiDecisionSummary {
  return {
    id: "00000000-0000-4000-a000-000000000001",
    createdAt: "2026-11-05T10:00:00Z",
    decision: partial.decision ?? "HUMAN_REVIEW",
    rejectionCode: null,
    hardReject: false,
    petScore: 80,
    compositeScore: 80,
    dimensionScores: null,
    aiGenerated: null,
    aiScore: null,
    reasonCodes: [],
    flags: [],
    speciesDetected: [],
    detectedObjects: null,
    processingMs: 1950,
    modelVersion: "test",
    media: {
      type: "pet_media",
      contentType: "image",
      url: null,
      storagePath: "pet-images/x.png",
      sizeBytes: null,
      sha256: null,
    },
    subject: {
      accountId: "a",
      ownerEmail: null,
      ownerName: null,
      petId: null,
      petName: null,
    },
    breed: {
      status: "not_checked",
      declaredBreedName: null,
      declaredIsCrossBreed: null,
      matchScore: null,
      detectedBreedName: null,
      detectedBreedScore: null,
    },
    review: {
      status: partial.reviewStatus ?? null,
      finalDecision: partial.finalDecision ?? null,
      finalRejectionCode: null,
      incorrectReasonCodes: [],
      missingReasonCodes: [],
      remarks: null,
      reviewedById: null,
      reviewedByEmail: null,
      reviewedAt: null,
    },
  };
}

describe("deriveStatus", () => {
  /** The six combinations staging actually produces, verified 2026-11-05. */
  it.each([
    ["APPROVED", null, null, "published"],
    ["REJECTED", null, null, "blocked"],
    ["REJECTED", "pending", null, "waiting_ai_rejected"],
    ["HUMAN_REVIEW", "pending", null, "waiting_ai_unsure"],
    ["HUMAN_REVIEW", "done", "APPROVED", "published_by_human"],
    ["HUMAN_REVIEW", "done", "REJECTED", "blocked_by_human"],
  ] as const)("%s + %s + %s -> %s", (d, review, final, expected) => {
    expect(
      deriveStatus(decision({ decision: d, reviewStatus: review, finalDecision: final })),
    ).toBe(expected);
  });

  /** A row the moderator must still act on must never be presented as finished. */
  it("prefers the queue over the model's verdict while a review is pending", () => {
    expect(deriveStatus(decision({ decision: "REJECTED", reviewStatus: "pending" }))).toBe(
      "waiting_ai_rejected",
    );
  });

  /** A human verdict overrides the model's, in both directions. */
  it("lets a human approval override a model rejection", () => {
    expect(
      deriveStatus(
        decision({ decision: "REJECTED", reviewStatus: "done", finalDecision: "APPROVED" }),
      ),
    ).toBe("published_by_human");
  });

  it("never returns a status outside AI_STATUSES", () => {
    for (const d of ["APPROVED", "REJECTED", "HUMAN_REVIEW"] as const) {
      for (const review of [null, "pending", "done"] as const) {
        for (const final of [null, "APPROVED", "REJECTED"] as const) {
          const status = deriveStatus(
            decision({ decision: d, reviewStatus: review, finalDecision: final }),
          );
          expect(AI_STATUSES).toContain(status);
        }
      }
    }
  });
});

describe("isActionable", () => {
  it("is true only while a review is pending", () => {
    expect(isActionable(decision({ reviewStatus: "pending" }))).toBe(true);
    expect(isActionable(decision({ reviewStatus: "done", finalDecision: "APPROVED" }))).toBe(false);
    expect(isActionable(decision({ decision: "APPROVED", reviewStatus: null }))).toBe(false);
  });

  /** A row the model decided alone is history, not work — it must not look clickable-to-act. */
  it("is false for a model-only rejection", () => {
    expect(isActionable(decision({ decision: "REJECTED", reviewStatus: null }))).toBe(false);
  });
});

describe("wasOverturned", () => {
  it("is true when the human reversed the model", () => {
    expect(
      wasOverturned(
        decision({ decision: "REJECTED", reviewStatus: "done", finalDecision: "APPROVED" }),
      ),
    ).toBe(true);
  });

  it("is false when the human agreed", () => {
    expect(
      wasOverturned(
        decision({ decision: "REJECTED", reviewStatus: "done", finalDecision: "REJECTED" }),
      ),
    ).toBe(false);
  });

  /** HUMAN_REVIEW was never a verdict, so there is nothing to overturn. */
  it("is false when the model asked for a human rather than deciding", () => {
    expect(
      wasOverturned(
        decision({ decision: "HUMAN_REVIEW", reviewStatus: "done", finalDecision: "REJECTED" }),
      ),
    ).toBe(false);
  });

  it("is false while still unreviewed", () => {
    expect(wasOverturned(decision({ decision: "REJECTED", reviewStatus: "pending" }))).toBe(false);
  });
});

describe("copy", () => {
  /** A status with no label renders blank, which is worse than an ugly label. */
  it("labels every status", () => {
    const labels = copy.aiReports.statusLabels as Record<string, string>;
    for (const status of AI_STATUSES) {
      expect(labels[status], `missing label for ${status}`).toBeTruthy();
    }
  });

  /** The spec's §5.2 list is closed — every code a rejection can carry needs a label. */
  it("labels every rejection code", () => {
    for (const code of AI_REJECTION_CODES) {
      expect(AI_REJECTION_LABELS[code], `missing label for ${code}`).toBeTruthy();
    }
  });

  /** The words a moderator reads should not be the database's uppercase enums. */
  it("keeps raw enum values out of the status labels", () => {
    const labels = Object.values(copy.aiReports.statusLabels as Record<string, string>);
    for (const label of labels) {
      expect(label).not.toMatch(/HUMAN_REVIEW|APPROVED|REJECTED|_/);
    }
  });
});

describe("badge help text", () => {
  /** A badge nobody can explain is worse than no badge; every status needs its hover text. */
  it("explains every status", () => {
    const help = copy.aiReports.statusHelp as Record<string, string>;
    for (const status of AI_STATUSES) {
      expect(help[status], `missing help for ${status}`).toBeTruthy();
      expect(help[status].length, `help for ${status} is too terse`).toBeGreaterThan(20);
    }
  });

  /** The two rare badges are the ones a new moderator has never met. */
  it("explains the rare badges", () => {
    expect(copy.aiReports.row.seriousHelp.length).toBeGreaterThan(20);
    expect(copy.aiReports.row.fakeImageHelp.length).toBeGreaterThan(20);
  });
});
