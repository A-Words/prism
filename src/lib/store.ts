"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AppState,
  DiagnosisRecord,
  DiagnosticResult,
  LearningPathProgress,
  MasteryLevel,
  SolutionPath,
  StudentProgress,
} from "@/types";
import { getKnowledgeNode, knowledgeNodes } from "@/lib/knowledge-graph";
import {
  getDashboardLearningCards,
  getLearnHref,
  resolveMockLearningScenario,
} from "@/lib/mock-data";
import { scoreToMastery } from "@/lib/utils";
import { DIAGNOSIS_STATUS_LABELS } from "@/types";

const defaultProgress: StudentProgress = {
  knowledge: {},
  practiceHistory: [],
  learningPaths: [],
  diagnosisRecords: [],
};

const OPEN_DIAGNOSIS_STATUSES: ReadonlySet<string> = new Set([
  "pending_recovery",
  "recovering",
  "retested_failed",
]);

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

export interface DashboardTask {
  id: string;
  questionId?: string;
  type:
    | "diagnosis_recovery"
    | "continue_learning"
    | "recommended_learning"
    | "targeted_practice";
  title: string;
  reason: string;
  detail?: string;
  href: string;
  estimatedMinutes: number;
  priority: number;
  statusLabel?: string;
}

/** 今日推荐 */
export interface DailyRecommendation {
  tasks: DashboardTask[];
  totalEstimatedMinutes: number;
  practiceCount: number;
}

function ensureProgress(progress?: Partial<StudentProgress>): StudentProgress {
  return {
    knowledge: progress?.knowledge || {},
    practiceHistory: progress?.practiceHistory || [],
    learningPaths: progress?.learningPaths || [],
    diagnosisRecords: progress?.diagnosisRecords || [],
  };
}

function applyMasteryUpdate(
  progress: StudentProgress,
  nodeId: string,
  correct: boolean,
  timestamp: string
) {
  const current = progress.knowledge[nodeId] || {
    nodeId,
    mastery: "none" as MasteryLevel,
    correctCount: 0,
    totalCount: 0,
  };
  const newCorrect = current.correctCount + (correct ? 1 : 0);
  const newTotal = current.totalCount + 1;
  const score = newCorrect / newTotal;

  return {
    ...progress,
    knowledge: {
      ...progress.knowledge,
      [nodeId]: {
        ...current,
        mastery: scoreToMastery(score),
        correctCount: newCorrect,
        totalCount: newTotal,
        lastPracticed: timestamp,
      },
    },
  };
}

function applyMasteryUpdates(
  progress: StudentProgress,
  nodeIds: string[],
  correct: boolean,
  timestamp: string
) {
  return [...new Set(nodeIds.filter(Boolean))].reduce(
    (nextProgress, nodeId) =>
      applyMasteryUpdate(nextProgress, nodeId, correct, timestamp),
    progress
  );
}

function sortDiagnosisRecords(records: DiagnosisRecord[]) {
  return [...records].sort((a, b) => {
    const aOpen = OPEN_DIAGNOSIS_STATUSES.has(a.status) ? 0 : 1;
    const bOpen = OPEN_DIAGNOSIS_STATUSES.has(b.status) ? 0 : 1;
    if (aOpen !== bOpen) {
      return aOpen - bOpen;
    }
    return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  });
}

function getRecoveryNodeIds(record: DiagnosisRecord) {
  return [
    ...(record.diagnosis.prerequisitesToFix || []).map((item) => item.id),
    record.recommendedTargetId || "",
  ].filter(Boolean);
}

function getPlanNodeMinutes(targetId: string, nodeId?: string) {
  const scenario = resolveMockLearningScenario({ targetId });
  const plan = scenario.plan;
  const targetNodeId =
    nodeId || plan.recommendedStartId || plan.nodes[0]?.knowledgeId;
  const node = plan.nodes.find((item) => item.knowledgeId === targetNodeId);
  return node?.estimatedMinutes || 12;
}

export function getDiagnosisRecoveryProgress(record: DiagnosisRecord) {
  const totalMicro = record.diagnosis.microExercises.length;
  const completedMicro = Object.keys(record.microExerciseResults).length;
  const retestDone = Boolean(record.retestResult);
  const baseRemainingMinutes =
    (totalMicro - completedMicro) * 4 + (retestDone ? 0 : 3);
  const remainingMinutes =
    record.status === "retested_failed"
      ? Math.max(8, baseRemainingMinutes)
      : Math.max(0, baseRemainingMinutes);

  return {
    completedMicro,
    totalMicro,
    retestDone,
    remainingMinutes,
  };
}

export function getDiagnosisRecordHref(record: DiagnosisRecord) {
  if (!record.recommendedTargetId) {
    return "/learn";
  }
  return getLearnHref(record.recommendedTargetId, record.recommendedQuery);
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      progress: defaultProgress,

      updateMastery: (nodeId: string, correct: boolean) => {
        set((state) => ({
          progress: applyMasteryUpdate(
            ensureProgress(state.progress),
            nodeId,
            correct,
            new Date().toISOString()
          ),
        }));
      },

      addPracticeRecord: (record) => {
        set((state) => ({
          progress: {
            ...ensureProgress(state.progress),
            practiceHistory: [
              ...ensureProgress(state.progress).practiceHistory,
              record,
            ],
          },
        }));
      },

      upsertLearningPath: (path) => {
        set((state) => {
          const progress = ensureProgress(state.progress);
          const existing = progress.learningPaths.findIndex(
            (item) => item.targetId === path.targetId
          );
          const nextPaths =
            existing >= 0
              ? progress.learningPaths.map((item, index) =>
                  index === existing ? path : item
                )
              : [...progress.learningPaths, path];

          return {
            progress: {
              ...progress,
              learningPaths: nextPaths,
            },
          };
        });
      },

      completeLearningPathStep: (targetId, completedNodeId, nextNodeId) => {
        set((state) => {
          const progress = ensureProgress(state.progress);
          const nextPaths = progress.learningPaths.map((path) => {
            if (path.targetId !== targetId) {
              return path;
            }

            const completedNodeIds = Array.from(
              new Set([...path.completedNodeIds, completedNodeId])
            );
            const reachedEnd =
              !nextNodeId || completedNodeIds.length >= path.totalSteps;

            return {
              ...path,
              completedNodeIds,
              currentNodeId: nextNodeId || completedNodeId,
              currentStep: reachedEnd
                ? path.totalSteps
                : Math.min(path.currentStep + 1, path.totalSteps),
              status: reachedEnd ? ("completed" as const) : ("active" as const),
              updatedAt: new Date().toISOString(),
              activeDiagnosisQuestionId: undefined,
            };
          });

          return {
            progress: {
              ...progress,
              learningPaths: nextPaths,
            },
          };
        });
      },

      recordDiagnosis: (diagnosis) => {
        const now = new Date().toISOString();
        const scenario = diagnosis.recommendedLearnTargetId
          ? resolveMockLearningScenario({
              targetId: diagnosis.recommendedLearnTargetId,
              query: diagnosis.recommendedLearnQuery,
            })
          : null;

        const record: DiagnosisRecord = {
          id: `${diagnosis.questionId}-${now}`,
          questionId: diagnosis.questionId,
          createdAt: now,
          updatedAt: now,
          status: "pending_recovery",
          diagnosis,
          recommendedTargetId: diagnosis.recommendedLearnTargetId,
          recommendedQuery: diagnosis.recommendedLearnQuery,
          recoveryLearningPathTargetId: scenario?.targetId,
          recoveryNodeId:
            diagnosis.recommendedLearnTargetId ||
            scenario?.plan.recommendedStartId ||
            scenario?.plan.nodes[0]?.knowledgeId,
          microExerciseResults: {},
        };

        set((state) => {
          const progress = ensureProgress(state.progress);
          const nextRecords = [
            record,
            ...progress.diagnosisRecords.filter(
              (item) =>
                !(
                  item.questionId === diagnosis.questionId &&
                  OPEN_DIAGNOSIS_STATUSES.has(item.status)
                )
            ),
          ];

          return {
            progress: {
              ...progress,
              diagnosisRecords: sortDiagnosisRecords(nextRecords),
            },
          };
        });

        return record;
      },

      submitDiagnosisMicroExercise: (questionId, exerciseId, answer, isCorrect) => {
        set((state) => {
          const progress = ensureProgress(state.progress);
          const now = new Date().toISOString();
          let nextProgress = progress;

          const nextRecords = progress.diagnosisRecords.map((record) => {
            if (record.questionId !== questionId) {
              return record;
            }

            nextProgress = applyMasteryUpdates(
              nextProgress,
              getRecoveryNodeIds(record),
              isCorrect,
              now
            );

            return {
              ...record,
              updatedAt: now,
              status:
                record.status === "pending_recovery"
                  ? ("recovering" as const)
                  : record.status,
              microExerciseResults: {
                ...record.microExerciseResults,
                [exerciseId]: {
                  answer,
                  isCorrect,
                  submittedAt: now,
                },
              },
            };
          });

          return {
            progress: {
              ...nextProgress,
              diagnosisRecords: sortDiagnosisRecords(nextRecords),
            },
          };
        });
      },

      submitDiagnosisRetest: (questionId, answer, isCorrect) => {
        set((state) => {
          const progress = ensureProgress(state.progress);
          const now = new Date().toISOString();
          let nextProgress = progress;

          const nextRecords = progress.diagnosisRecords.map((record) => {
            if (record.questionId !== questionId) {
              return record;
            }

            nextProgress = applyMasteryUpdates(
              nextProgress,
              getRecoveryNodeIds(record),
              isCorrect,
              now
            );

            return {
              ...record,
              updatedAt: now,
              completedAt: isCorrect ? now : record.completedAt,
              status: isCorrect
                ? ("retested_passed" as const)
                : ("retested_failed" as const),
              retestResult: {
                answer,
                isCorrect,
                submittedAt: now,
              },
            };
          });

          const nextPaths = nextProgress.learningPaths.map((path) =>
            path.activeDiagnosisQuestionId === questionId
              ? {
                  ...path,
                  updatedAt: now,
                  activeDiagnosisQuestionId: isCorrect
                    ? undefined
                    : path.activeDiagnosisQuestionId,
                }
              : path
          );

          return {
            progress: {
              ...nextProgress,
              learningPaths: nextPaths,
              diagnosisRecords: sortDiagnosisRecords(nextRecords),
            },
          };
        });
      },

      startDiagnosisRecovery: (questionId) => {
        const progress = ensureProgress(get().progress);
        const record = progress.diagnosisRecords.find(
          (item) => item.questionId === questionId
        );
        if (!record || !record.recommendedTargetId) {
          return undefined;
        }

        const scenario = resolveMockLearningScenario({
          targetId: record.recommendedTargetId,
          query: record.recommendedQuery,
        });
        const recoveryNodeId =
          record.recoveryNodeId ||
          record.recommendedTargetId ||
          scenario.plan.recommendedStartId ||
          scenario.plan.nodes[0]?.knowledgeId;
        const recoveryIndex = Math.max(
          0,
          scenario.plan.nodes.findIndex(
            (node) => node.knowledgeId === recoveryNodeId
          )
        );
        const completedNodeIds = scenario.plan.nodes
          .slice(0, recoveryIndex)
          .map((node) => node.knowledgeId);
        const now = new Date().toISOString();
        const href = getLearnHref(
          scenario.targetId,
          record.recommendedQuery || scenario.title
        );

        set((state) => {
          const currentProgress = ensureProgress(state.progress);
          const existingPath = currentProgress.learningPaths.find(
            (item) => item.targetId === scenario.targetId
          );
          const nextPath: LearningPathProgress = {
            targetId: scenario.targetId,
            targetName:
              existingPath?.targetName ||
              getKnowledgeNode(scenario.targetId)?.name ||
              scenario.dashboardTitle,
            currentNodeId: recoveryNodeId,
            currentStep: recoveryIndex + 1,
            totalSteps: scenario.plan.nodes.length,
            completedNodeIds,
            startedAt: existingPath?.startedAt || now,
            updatedAt: now,
            status: "active",
            activeDiagnosisQuestionId: questionId,
          };

          const nextLearningPaths = existingPath
            ? currentProgress.learningPaths.map((item) =>
                item.targetId === scenario.targetId ? nextPath : item
              )
            : [...currentProgress.learningPaths, nextPath];

          const nextRecords = currentProgress.diagnosisRecords.map((item) =>
                item.questionId === questionId
              ? {
                  ...item,
                  updatedAt: now,
                  status: "recovering" as const,
                  recoveryStartedAt: now,
                  recoveryLearningPathTargetId: scenario.targetId,
                  recoveryNodeId,
                }
              : item
          );

          return {
            progress: {
              ...currentProgress,
              learningPaths: nextLearningPaths,
              diagnosisRecords: sortDiagnosisRecords(nextRecords),
            },
          };
        });

        return href;
      },

      getMastery: (nodeId: string) => {
        const k = ensureProgress(get().progress).knowledge[nodeId];
        return k?.mastery || "none";
      },

      getMasteryScore: (nodeId: string) => {
        const k = ensureProgress(get().progress).knowledge[nodeId];
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
      version: 2,
      migrate: (persistedState) => {
        if (
          persistedState &&
          typeof persistedState === "object" &&
          "progress" in persistedState
        ) {
          const state = persistedState as { progress?: Partial<StudentProgress> };
          return {
            ...state,
            progress: ensureProgress(state.progress),
          };
        }
        return persistedState;
      },
      partialize: (state) => ({
        progress: ensureProgress(state.progress),
      }),
    }
  )
);

// ---- Derived helpers (outside store to avoid serialization issues) ----

/** 获取当前薄弱知识点（正确率低或练习少但有错） */
export function getWeakPoints(progress: StudentProgress): WeakPoint[] {
  const weak: WeakPoint[] = [];

  for (const [nodeId, k] of Object.entries(ensureProgress(progress).knowledge)) {
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

  weak.sort((a, b) => a.correctRate - b.correctRate);
  return weak;
}

/** 获取最近练习记录 */
export function getRecentPractice(
  progress: StudentProgress,
  limit = 5
): (StudentProgress["practiceHistory"][0] & { index: number })[] {
  return ensureProgress(progress)
    .practiceHistory.map((r, i) => ({ ...r, index: i }))
    .slice(-limit)
    .reverse();
}

/** 获取最近诊断 */
export function getLatestDiagnosisRecord(progress: StudentProgress) {
  const record = sortDiagnosisRecords(ensureProgress(progress).diagnosisRecords)[0];
  if (!record) {
    return undefined;
  }

  return {
    ...record,
    href: getDiagnosisRecordHref(record),
  };
}

/** 生成今日学习推荐 */
export function getDailyRecommendation(
  progress: StudentProgress
): DailyRecommendation {
  const safeProgress = ensureProgress(progress);
  const tasks: DashboardTask[] = [];

  const latestDiagnosis = sortDiagnosisRecords(safeProgress.diagnosisRecords).find(
    (record) => OPEN_DIAGNOSIS_STATUSES.has(record.status)
  );
  if (latestDiagnosis) {
    const recovery = getDiagnosisRecoveryProgress(latestDiagnosis);
    const targetName =
      getKnowledgeNode(latestDiagnosis.recommendedTargetId || "")?.name ||
      "对应知识点";

    tasks.push({
      id: `diagnosis-${latestDiagnosis.id}`,
      questionId: latestDiagnosis.questionId,
      type: "diagnosis_recovery",
      title:
        latestDiagnosis.diagnosis.recoveryTitle || `立即回补：${targetName}`,
      reason: `错因：${latestDiagnosis.diagnosis.errorCategoryLabel} · 微练 ${recovery.completedMicro}/${recovery.totalMicro}`,
      detail: `推荐回补：${targetName}`,
      href: getDiagnosisRecordHref(latestDiagnosis),
      estimatedMinutes: recovery.remainingMinutes,
      priority: 0,
      statusLabel: DIAGNOSIS_STATUS_LABELS[latestDiagnosis.status],
    });
  }

  const activePath = [...safeProgress.learningPaths]
    .reverse()
    .find((path) => path.status === "active");
  if (activePath) {
    const scenario = resolveMockLearningScenario({ targetId: activePath.targetId });
    const currentNodeName =
      getKnowledgeNode(activePath.currentNodeId)?.name || activePath.currentNodeId;
    tasks.push({
      id: `path-${activePath.targetId}`,
      type: "continue_learning",
      title: `继续学习：${activePath.targetName}`,
      reason: `当前节点：${currentNodeName} · 进度 ${activePath.currentStep}/${activePath.totalSteps}`,
      detail: activePath.activeDiagnosisQuestionId ? "由最近诊断触发回补" : "接着上次继续",
      href: getLearnHref(activePath.targetId, activePath.targetName),
      estimatedMinutes: getPlanNodeMinutes(
        scenario.targetId,
        activePath.currentNodeId
      ),
      priority: 1,
    });
  }

  const weakPoints = getWeakPoints(safeProgress);
  const weakRecommendations = weakPoints.slice(0, 2).map((weak) => {
    const scenario = resolveMockLearningScenario({ targetId: weak.nodeId });
    const estimatedMinutes = getPlanNodeMinutes(
      scenario.targetId,
      scenario.plan.recommendedStartId
    );
    return {
      id: scenario.targetId,
      name: scenario.dashboardTitle,
      reason: `优先补「${weak.nodeName}」：${weak.reason}`,
      href: getLearnHref(scenario.targetId, scenario.title),
      estimatedMinutes,
    };
  });

  const usedRecommendationIds = new Set(
    tasks
      .filter((task) => task.type === "continue_learning")
      .map((task) => task.id.replace(/^path-/, ""))
  );
  const featuredRecommendation = [
    ...weakRecommendations,
    ...getDashboardLearningCards()
      .filter((card) => !usedRecommendationIds.has(card.id))
      .map((card) => ({
        ...card,
        estimatedMinutes: getPlanNodeMinutes(card.id),
      })),
  ].find((item) => !usedRecommendationIds.has(item.id));

  if (featuredRecommendation && tasks.length < 3) {
    tasks.push({
      id: `recommend-${featuredRecommendation.id}`,
      type: "recommended_learning",
      title: `推荐学习：${featuredRecommendation.name}`,
      reason: featuredRecommendation.reason,
      href: featuredRecommendation.href,
      estimatedMinutes: featuredRecommendation.estimatedMinutes,
      priority: 2,
    });
  } else if (tasks.length < 3) {
    const practiceCount = Math.max(3, weakPoints.length * 2);
    tasks.push({
      id: "practice-focus",
      type: "targeted_practice",
      title: "针对性练习",
      reason:
        weakPoints.length > 0
          ? `建议完成 ${practiceCount} 道题，优先检测最近薄弱点`
          : "完成一组练习，建立第一条诊断记录",
      href: "/practice",
      estimatedMinutes: practiceCount * 3,
      priority: 3,
    });
  }

  const finalTasks = tasks
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 3);

  return {
    tasks: finalTasks,
    totalEstimatedMinutes: finalTasks.reduce(
      (sum, task) => sum + task.estimatedMinutes,
      0
    ),
    practiceCount: Math.max(3, weakPoints.length * 2),
  };
}
