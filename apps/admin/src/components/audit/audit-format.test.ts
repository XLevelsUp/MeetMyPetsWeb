import { describe, expect, it } from "vitest";

import { actionLabel, actionTone, isTeamAction } from "@/components/audit/audit-format";

describe("Team message rows in the audit log", () => {
  it("labels and colours the two actions seen on Staging", () => {
    expect(actionLabel("team_message.send")).toBe("Team message sent");
    expect(actionTone("team_message.send")).toBe("message");
    expect(actionLabel("team_message.schedule")).toBe("Team message scheduled");
    expect(actionTone("team_message.schedule")).toBe("message");
  });

  it("colours newer backend verbs by effect, keeping the existing key's meaning", () => {
    expect(actionTone("team_message.delete")).toBe("restrict");
    expect(actionTone("team_message.cancel")).toBe("caution");
    expect(actionTone("welcome.stop")).toBe("caution");
    expect(actionTone("team_message.edit")).toBe("content");
    expect(actionTone("welcome.set")).toBe("message");
    expect(actionLabel("team_message.cancel")).toBe("Team message cancelled");
    expect(actionLabel("welcome.set")).toBe("Welcome message saved");
  });

  it("leaves everything else alone", () => {
    expect(isTeamAction("blog.delete")).toBe(false);
    expect(actionTone("blog.delete")).toBe("restrict");
    expect(actionTone("something.new")).toBe("neutral");
    expect(actionLabel("something.new")).toBe("something.new");
    expect(actionLabel("team_message.teleport")).toBe("team_message.teleport");
  });
});
