import { create } from "zustand";
import type { InterventionEvent, KnowledgeOutlineJSON, NoteSection, VisionStateJSON } from "@prism/contracts";

type FocusStore = {
  outline: KnowledgeOutlineJSON | null;
  selectedNodeId: string | null;
  notesByNode: Record<string, NoteSection>;
  visionState: VisionStateJSON | null;
  intervention: InterventionEvent | null;
  consentEnabled: boolean;
  setOutline: (outline: KnowledgeOutlineJSON) => void;
  setSelectedNode: (id: string) => void;
  setNote: (note: NoteSection) => void;
  setVision: (vision: VisionStateJSON | null) => void;
  setIntervention: (event: InterventionEvent | null) => void;
  toggleConsent: (enabled: boolean) => void;
};

export const useFocusStore = create<FocusStore>((set) => ({
  outline: null,
  selectedNodeId: null,
  notesByNode: {},
  visionState: null,
  intervention: null,
  consentEnabled: false,
  setOutline: (outline) =>
    set({
      outline,
      selectedNodeId: outline.nodes[0]?.id ?? null,
    }),
  setSelectedNode: (id) => set({ selectedNodeId: id }),
  setNote: (note) => set((s) => ({ notesByNode: { ...s.notesByNode, [note.node_id]: note } })),
  setVision: (vision) => set({ visionState: vision }),
  setIntervention: (event) => set({ intervention: event }),
  toggleConsent: (enabled) => set({ consentEnabled: enabled }),
}));
