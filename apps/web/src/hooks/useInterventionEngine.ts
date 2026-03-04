import type { VisionStateJSON } from "@prism/contracts";

export function shouldTriggerIntervention(samples: VisionStateJSON[]): boolean {
  if (samples.length < 2) {
    return false;
  }
  const latestTwo = samples.slice(-2);
  return latestTwo.every((item) =>
    (item.emotion === "frustrated" || item.posture === "too_close" || item.posture === "slouching") && item.confidence >= 0.6,
  );
}
