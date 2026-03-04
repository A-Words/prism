import { describe, expect, it } from "vitest";
import { shouldTriggerIntervention } from "../hooks/useInterventionEngine";

describe("shouldTriggerIntervention", () => {
  it("triggers when two continuous frustrated samples occur", () => {
    const result = shouldTriggerIntervention([
      {
        focus_level: "low",
        emotion: "frustrated",
        posture: "normal",
        confidence: 0.9,
        sampled_at: new Date().toISOString(),
      },
      {
        focus_level: "low",
        emotion: "frustrated",
        posture: "too_close",
        confidence: 0.81,
        sampled_at: new Date().toISOString(),
      },
    ]);
    expect(result).toBe(true);
  });

  it("does not trigger with one sample", () => {
    const result = shouldTriggerIntervention([
      {
        focus_level: "low",
        emotion: "frustrated",
        posture: "normal",
        confidence: 0.9,
        sampled_at: new Date().toISOString(),
      },
    ]);
    expect(result).toBe(false);
  });
});
