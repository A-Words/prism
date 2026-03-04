import { describe, expect, it } from "vitest";

type NoteMap = Record<string, string>;

function resolveNote(nodeId: string | null, notes: NoteMap): string | null {
  if (!nodeId) {
    return null;
  }
  return notes[nodeId] ?? null;
}

describe("node note mapping", () => {
  it("resolves note by node id in one lookup", () => {
    const notes: NoteMap = { n1: "A", n2: "B" };
    expect(resolveNote("n2", notes)).toBe("B");
  });
});
