"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppState,
  MasteryLevel,
  StudentProgress,
  SolutionPath,
  DiagnosticResult,
} from "@/types";
import { scoreToMastery } from "@/lib/utils";

const defaultProgress: StudentProgress = {
  knowledge: {},
  practiceHistory: [],
  learningPaths: [],
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      progress: defaultProgress,

      updateMastery: (nodeId: string, correct: boolean) => {
        set((state) => {
          const current = state.progress.knowledge[nodeId] || {
            nodeId,
            mastery: "none" as MasteryLevel,
            correctCount: 0,
            totalCount: 0,
          };

          const newCorrect = current.correctCount + (correct ? 1 : 0);
          const newTotal = current.totalCount + 1;
          const score = newCorrect / newTotal;

          return {
            progress: {
              ...state.progress,
              knowledge: {
                ...state.progress.knowledge,
                [nodeId]: {
                  ...current,
                  mastery: scoreToMastery(score),
                  correctCount: newCorrect,
                  totalCount: newTotal,
                  lastPracticed: new Date().toISOString(),
                },
              },
            },
          };
        });
      },

      addPracticeRecord: (record) => {
        set((state) => ({
          progress: {
            ...state.progress,
            practiceHistory: [...state.progress.practiceHistory, record],
          },
        }));
      },

      getMastery: (nodeId: string) => {
        const k = get().progress.knowledge[nodeId];
        return k?.mastery || "none";
      },

      getMasteryScore: (nodeId: string) => {
        const k = get().progress.knowledge[nodeId];
        if (!k || k.totalCount === 0) return 0;
        return k.correctCount / k.totalCount;
      },

      selectedKnowledgeId: null,
      setSelectedKnowledgeId: (id) => set({ selectedKnowledgeId: id }),

      currentSolutionPath: null,
      setCurrentSolutionPath: (path: SolutionPath | null) =>
        set({ currentSolutionPath: path }),

      currentDiagnosis: null,
      setCurrentDiagnosis: (result: DiagnosticResult | null) =>
        set({ currentDiagnosis: result }),
    }),
    {
      name: "prism-student-progress",
      partialize: (state) => ({
        progress: state.progress,
      }),
    }
  )
);
