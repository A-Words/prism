"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppState,
  LearningPathProgress,
  MasteryLevel,
  StudentProgress,
  SolutionPath,
  DiagnosticResult,
} from "@/types";
import { scoreToMastery } from "@/lib/utils";
import { knowledgeNodes } from "@/lib/knowledge-graph";
import {
  getDashboardLearningCards,
  getLatestDiagnosisSummary,
  getLearnHref,
  resolveMockLearningScenario,
} from "@/lib/mock-data";

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
    href: string;
    currentStep: number;
    totalSteps: number;
  };
  recommendedKnowledge: { id: string; name: string; reason: string; href: string }[];
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

      upsertLearningPath: (path) => {
        set((state) => {
          const existing = state.progress.learningPaths.findIndex(
            (item) => item.targetId === path.targetId
          );
          const nextPaths =
            existing >= 0
              ? state.progress.learningPaths.map((item, index) =>
                  index === existing ? path : item
                )
              : [...state.progress.learningPaths, path];

          return {
            progress: {
              ...state.progress,
              learningPaths: nextPaths,
            },
          };
        });
      },

      completeLearningPathStep: (targetId, completedNodeId, nextNodeId) => {
        set((state) => {
          const nextPaths = state.progress.learningPaths.map((path) => {
            if (path.targetId !== targetId) {
              return path;
            }

            const completedNodeIds = Array.from(
              new Set([...path.completedNodeIds, completedNodeId])
            );
            const reachedEnd = !nextNodeId || completedNodeIds.length >= path.totalSteps;

            return {
              ...path,
              completedNodeIds,
              currentNodeId: nextNodeId || completedNodeId,
              currentStep: reachedEnd
                ? path.totalSteps
                : Math.min(path.currentStep + 1, path.totalSteps),
              status: reachedEnd ? ("completed" as const) : ("active" as const),
              updatedAt: new Date().toISOString(),
            };
          });

          return {
            progress: {
              ...state.progress,
              learningPaths: nextPaths,
            },
          };
        });
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
  const activePath = progress.learningPaths.length > 0
    ? [...progress.learningPaths]
        .reverse()
        .find((path) => path.status === "active")
    : undefined;

  let continuePath: DailyRecommendation["continuePath"];
  if (activePath) {
    continuePath = {
      targetId: activePath.targetId,
      targetName: activePath.targetName,
      href: getLearnHref(activePath.targetId, activePath.targetName),
      currentStep: activePath.currentStep,
      totalSteps: activePath.totalSteps,
    };
  }

  const weakPoints = getWeakPoints(progress);
  const weakRecommendations = weakPoints
    .slice(0, 2)
    .map((weak) => {
      const scenario = resolveMockLearningScenario({ targetId: weak.nodeId });
      return {
        id: scenario.targetId,
        name: scenario.dashboardTitle,
        reason: `优先补「${weak.nodeName}」：${weak.reason}`,
        href: getLearnHref(scenario.targetId, scenario.title),
      };
    });

  const featuredRecommendations = getDashboardLearningCards()
    .filter(
      (card) => !weakRecommendations.some((item) => item.id === card.id)
    )
    .slice(0, Math.max(0, 2 - weakRecommendations.length));

  const recommended = [...weakRecommendations, ...featuredRecommendations];

  const weakCount = weakPoints.length;
  const practiceCount = Math.max(3, weakCount * 2);

  return {
    continuePath,
    recommendedKnowledge: recommended,
    practiceCount,
  };
}

export function getLatestDiagnosisRecord(progress: StudentProgress) {
  const latestWrong = [...progress.practiceHistory]
    .reverse()
    .find((record) => !record.isCorrect);
  if (!latestWrong) {
    return undefined;
  }

  const diagnosis = getLatestDiagnosisSummary(latestWrong.questionId);
  if (!diagnosis) {
    return undefined;
  }

  return {
    questionId: latestWrong.questionId,
    createdAt: latestWrong.timestamp,
    diagnosis,
    href: diagnosis.recommendedLearnTargetId
      ? getLearnHref(
          diagnosis.recommendedLearnTargetId,
          diagnosis.recommendedLearnQuery
        )
      : "/learn",
  };
}
