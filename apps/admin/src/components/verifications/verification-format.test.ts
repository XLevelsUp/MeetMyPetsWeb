import { describe, expect, it } from "vitest";

import { expiryState, waitingTone } from "@/components/verifications/verification-format";
import { DAY_THRESHOLDS } from "@/lib/day-thresholds";

const NOW = Date.parse("2026-11-21T12:00:00Z");
const DAY = 86_400_000;
const at = (offsetMs: number) => new Date(NOW + offsetMs).toISOString();

describe("expiryState", () => {
  it("follows the shared countdown scale", () => {
    expect(expiryState(null, NOW)).toBeNull();
    expect(expiryState(at(-DAY), NOW)).toBe("past");
    expect(expiryState(at(DAY_THRESHOLDS.countdown.red * DAY), NOW)).toBe("red");
    expect(expiryState(at(DAY_THRESHOLDS.countdown.amber * DAY), NOW)).toBe("amber");
    expect(expiryState(at(DAY_THRESHOLDS.countdown.amber * DAY + 1), NOW)).toBe("green");
  });
});

describe("waitingTone", () => {
  const { amber, red } = DAY_THRESHOLDS.waiting;

  it("is green under the amber threshold", () => {
    expect(waitingTone(0)).toBe("fresh");
    expect(waitingTone(amber - 1)).toBe("fresh");
  });

  it("is amber from the amber threshold until the red one", () => {
    expect(waitingTone(amber)).toBe("aging");
    expect(waitingTone(red - 1)).toBe("aging");
  });

  it("is red from the red threshold on", () => {
    expect(waitingTone(red)).toBe("overdue");
    expect(waitingTone(60)).toBe("overdue");
  });
});
