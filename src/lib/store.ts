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
import { knowledgeNodes } from "@/lib/knowledge-graph";

const defaultProgress: StudentProgress = {
  knowledge: {},
  practiceHistory: [],
  learningPaths: [],
};

/** 薄弱点信息 */
export interface WeakPoint {
  nodeId: string;
  nodeName: string;
  category: string;
  mastery: MasteryLevel;
  reason: string;
  correctRate: number;
  totalCount: number;
}

/** 今日推荐 */
export interface DailyRecommendation {
  continuePath?: {
    targetId: string;
    targetName: string;
    currentStep: number;
    totalSteps: number;
  };
  recommendedKnowledge: { id: string; name: string; reason: string }[];
  practiceCount: number;
}

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

// ---- Derived helpers (outside store to avoid serialization issues) ----

/** 获取当前薄弱知识点（正确率低或练习少但有错） */
export function getWeakPoints(progress: StudentProgress): WeakPoint[] {
  const weak: WeakPoint[] = [];

  for (const [nodeId, k] of Object.entries(progress.knowledge)) {
    if (k.totalCount === 0) continue;
    const rate = k.correctCount / k.totalCount;
    const node = knowledgeNodes.find((n) => n.id === nodeId);
    if (!node) continue;

    if (k.mastery === "low" || k.mastery === "none" || rate < 0.6) {
      let reason = "";
      if (k.totalCount >= 3 && rate < 0.4) {
        reason = `练习 ${k.totalCount} 题，正确率仅 ${Math.round(rate * 100)}%`;
      } else if (k.totalCount >= 2 && rate < 0.6) {
        reason = `正确率 ${Math.round(rate * 100)}%，尚未稳定掌握`;
      } else if (k.totalCount === 1 && k.correctCount === 0) {
        reason = "做过 1 题且答错，需要巩固";
      } else {
        reason = `掌握程度：${k.mastery === "low" ? "初步了解" : "未掌握"}`;
      }

      weak.push({
        nodeId,
        nodeName: node.name,
        category: node.category,
        mastery: k.mastery,
        reason,
        correctRate: rate,
        totalCount: k.totalCount,
      });
    }
  }

  // Sort by correctRate ascending (weakest first)
  weak.sort((a, b) => a.correctRate - b.correctRate);
  return weak;
}

/** 获取最近练习记录（含知识点名称） */
export function getRecentPractice(
  progress: StudentProgress,
  limit = 5
): (StudentProgress["practiceHistory"][0] & { index: number })[] {
  return progress.practiceHistory
    .map((r, i) => ({ ...r, index: i }))
    .slice(-limit)
    .reverse();
}

/** 生成今日学习推荐 */
export function getDailyRecommendation(
  progress: StudentProgress
): DailyRecommendation {
  // Continue last learning path
  const activePath = progress.learningPaths.length > 0
    ? progress.learningPaths[progress.learningPaths.length - 1]
    : undefined;

  let continuePath: DailyRecommendation["continuePath"];
  if (activePath) {
    const node = knowledgeNodes.find((n) => n.id === activePath.targetId);
    if (node) {
      continuePath = {
        targetId: activePath.targetId,
        targetName: node.name,
        currentStep: activePath.currentStep,
        totalSteps: 5, // approximation
      };
    }
  }

  // Recommend knowledge points: pick ones that are "medium" or have prerequisites mastered
  const unmastered = knowledgeNodes.filter((n) => {
    const k = progress.knowledge[n.id];
    if (!k) return true;
    return k.mastery === "none" || k.mastery === "low" || k.mastery === "medium";
  });

  // Prefer nodes whose prerequisites are already mastered
  const withReadiness = unmastered.map((n) => {
    const prereqsMastered = n.prerequisites.every((pid) => {
      const k = progress.knowledge[pid];
      return k && (k.mastery === "high" || k.mastery === "full");
    });
    const partialPrereqs = n.prerequisites.filter((pid) => {
      const k = progress.knowledge[pid];
      return k && k.mastery !== "none";
    }).length;
    return {
      node: n,
      ready: prereqsMastered,
      partialScore: n.prerequisites.length > 0
        ? partialPrereqs / n.prerequisites.length
        : 0.5,
    };
  });

  withReadiness.sort((a, b) => {
    if (a.ready !== b.ready) return a.ready ? -1 : 1;
    return b.partialScore - a.partialScore;
  });

  const recommended = withReadiness.slice(0, 2).map((w) => ({
    id: w.node.id,
    name: w.node.name,
    reason: w.ready
      ? "前置知识已掌握，可以学习"
      : `难度 ${"★".repeat(w.node.difficulty)}，适合当前水平`,
  }));

  // Suggest practice count based on weak points
  const weakCount = getWeakPoints(progress).length;
  const practiceCount = Math.max(3, weakCount * 2);

  return {
    continuePath,
    recommendedKnowledge: recommended,
    practiceCount,
  };
}
