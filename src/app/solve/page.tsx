"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  AlertTriangle,
  BookOpen,
  ChevronRight,
  Eye,
  EyeOff,
  Footprints,
  GraduationCap,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  Route,
  Send,
  Sparkles,
  Target,
} from "lucide-react";
import { SolutionNode } from "@/components/graph/solution-node";
import type { SolutionNodeData } from "@/components/graph/solution-node";
import { MathText } from "@/components/ui/math-renderer";
import { getKnowledgeNode } from "@/lib/knowledge-graph";
import { mockSolutionPath } from "@/lib/mock-data";
import { useAppStore } from "@/lib/store";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  STEP_TYPE_COLORS,
  STEP_TYPE_LABELS,
  type SolutionAttemptSession,
  type SolutionPath,
  type SolutionStep,
  type SolutionStepAttempt,
  type SolutionStepState,
  type SolutionStepType,
} from "@/types";

const nodeTypes = { solutionStep: SolutionNode };

const EXAMPLE_PROBLEMS = [
  "解不等式 x² - 3x + 2 < 0",
  "已知 sin x + cos x = √2，求 sin 2x 的值",
  "若 P(A)=0.6，P(B)=0.5，P(A∩B)=0.3，求 P(A|B)",
];

function createProblemKey(problem: string) {
  return problem.trim().toLowerCase().replace(/\s+/g, " ");
}

function createInitialStepStates(path: SolutionPath) {
  const mainSteps = path.steps.filter((step) => step.branchType !== "mistake");
  return Object.fromEntries(
    path.steps.map((step) => [
      step.id,
      step.branchType === "mistake"
        ? ("locked" as const)
        : step.id === mainSteps[0]?.id
          ? ("hinted" as const)
          : ("locked" as const),
    ])
  ) as Record<string, SolutionStepState>;
}

function buildSession(
  path: SolutionPath,
  problem: string,
  partial?: Partial<SolutionAttemptSession>
): SolutionAttemptSession {
  const mainSteps = path.steps.filter((step) => step.branchType !== "mistake");

  return {
    problemKey: createProblemKey(problem),
    problem,
    pathSnapshot: path,
    activeStepId: partial?.activeStepId || mainSteps[0]?.id,
    stepStates: partial?.stepStates || createInitialStepStates(path),
    selectedAnswers: partial?.selectedAnswers || {},
    attempts: partial?.attempts || {},
    highlightedBranchStepIds: partial?.highlightedBranchStepIds || [],
    updatedAt: new Date().toISOString(),
  };
}

function EmptyState() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="glass-card p-6">
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-cyan-500" />
          <h2 className="text-base font-bold text-slate-900">如何使用这个页面</h2>
        </div>
        <div className="space-y-3 text-sm text-slate-500">
          <p>1. 输入题目后先看题目画像，确认题型、知识点和前置能力。</p>
          <p>2. 沿主干节点一步步推进，在关键节点完成“我来试一步”。</p>
          <p>3. 如果方向偏离，系统会点亮易错分支，并把薄弱点写回首页与学习路径。</p>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-500" />
          <h2 className="text-base font-bold text-slate-900">当前页面能力</h2>
        </div>
        <div className="space-y-2 text-sm text-slate-500">
          <p>结构化题目画像：学段、题型、知识点、难度、前置能力。</p>
          <p>主干 + 易错分支同图展示，失败后可直接关联学习路径。</p>
          <p>互动点只反馈方向和提示，不直接展开标准答案。</p>
        </div>
      </div>
    </div>
  );
}

export default function SolvePage() {
  const progress = useAppStore((state) => state.progress);
  const setCurrentSolutionPath = useAppStore((state) => state.setCurrentSolutionPath);
  const upsertSolutionAttemptSession = useAppStore(
    (state) => state.upsertSolutionAttemptSession
  );
  const startSolutionRecovery = useAppStore((state) => state.startSolutionRecovery);

  const [problem, setProblem] = useState("");
  const [loading, setLoading] = useState(false);
  const [solutionPath, setSolutionPath] = useState<SolutionPath | null>(null);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [stepStates, setStepStates] = useState<Record<string, SolutionStepState>>({});
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string | null>>({});
  const [attempts, setAttempts] = useState<Record<string, SolutionStepAttempt>>({});
  const [highlightedBranchStepIds, setHighlightedBranchStepIds] = useState<string[]>([]);
  const [didRestorePersistedSession, setDidRestorePersistedSession] = useState(false);

  const latestSession = useMemo(
    () =>
      [...progress.solutionAttempts].sort(
        (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
      )[0],
    [progress.solutionAttempts]
  );

  const restoreSession = useCallback(
    (session: SolutionAttemptSession) => {
      setProblem(session.problem);
      setSolutionPath(session.pathSnapshot);
      setCurrentSolutionPath(session.pathSnapshot);
      setActiveStepId(session.activeStepId || session.pathSnapshot.steps[0]?.id || null);
      setStepStates(session.stepStates);
      setSelectedAnswers(session.selectedAnswers);
      setAttempts(session.attempts);
      setHighlightedBranchStepIds(session.highlightedBranchStepIds);
    },
    [setCurrentSolutionPath]
  );

  useEffect(() => {
    if (!didRestorePersistedSession && !solutionPath && latestSession) {
      restoreSession(latestSession);
      setDidRestorePersistedSession(true);
    }
  }, [didRestorePersistedSession, latestSession, restoreSession, solutionPath]);

  const persistSession = useCallback(
    (
      path: SolutionPath,
      currentProblem: string,
      patch?: Partial<SolutionAttemptSession>
    ) => {
      upsertSolutionAttemptSession(
        buildSession(path, currentProblem, {
          activeStepId: activeStepId || undefined,
          stepStates,
          selectedAnswers,
          attempts,
          highlightedBranchStepIds,
          ...patch,
        })
      );
    },
    [
      activeStepId,
      attempts,
      highlightedBranchStepIds,
      selectedAnswers,
      stepStates,
      upsertSolutionAttemptSession,
    ]
  );

  const loadPath = useCallback(
    (path: SolutionPath, problemText: string) => {
      const problemKey = createProblemKey(problemText);
      const existingSession = progress.solutionAttempts.find(
        (item) => item.problemKey === problemKey
      );

      setSolutionPath(path);
      setCurrentSolutionPath(path);

      if (existingSession) {
        const nextSession: SolutionAttemptSession = {
          ...existingSession,
          problem: problemText,
          pathSnapshot: path,
          updatedAt: new Date().toISOString(),
        };
        restoreSession(nextSession);
        upsertSolutionAttemptSession(nextSession);
        return;
      }

      const nextSession = buildSession(path, problemText);
      setActiveStepId(nextSession.activeStepId || null);
      setStepStates(nextSession.stepStates);
      setSelectedAnswers(nextSession.selectedAnswers);
      setAttempts(nextSession.attempts);
      setHighlightedBranchStepIds(nextSession.highlightedBranchStepIds);
      upsertSolutionAttemptSession(nextSession);
    },
    [
      progress.solutionAttempts,
      restoreSession,
      setCurrentSolutionPath,
      upsertSolutionAttemptSession,
    ]
  );

  const handleSolve = useCallback(async () => {
    if (!problem.trim()) return;
    setLoading(true);

    try {
      const response = await fetch("/api/solve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem: problem.trim() }),
      });

      if (response.ok) {
        const data = (await response.json()) as SolutionPath;
        loadPath(data, problem.trim());
      } else {
        loadPath(mockSolutionPath, problem.trim());
      }
    } catch {
      loadPath(mockSolutionPath, problem.trim());
    } finally {
      setLoading(false);
    }
  }, [loadPath, problem]);

  const handleDemo = useCallback(() => {
    const demoProblem = "解不等式 x² - 3x + 2 < 0";
    setProblem(demoProblem);
    loadPath(mockSolutionPath, demoProblem);
  }, [loadPath]);

  const handleReset = useCallback(() => {
    setProblem("");
    setSolutionPath(null);
    setCurrentSolutionPath(null);
    setActiveStepId(null);
    setStepStates({});
    setSelectedAnswers({});
    setAttempts({});
    setHighlightedBranchStepIds([]);
  }, [setCurrentSolutionPath]);

  const stepMap = useMemo(
    () => new Map(solutionPath?.steps.map((step) => [step.id, step]) || []),
    [solutionPath]
  );

  const mainSteps = useMemo(
    () => solutionPath?.steps.filter((step) => step.branchType !== "mistake") || [],
    [solutionPath]
  );

  const handleSelectStep = useCallback(
    (stepId: string) => {
      if (!solutionPath) return;
      setActiveStepId(stepId);
      persistSession(solutionPath, problem || solutionPath.problem, {
        activeStepId: stepId,
      });
    },
    [persistSession, problem, solutionPath]
  );

  const handleSelectAnswer = useCallback(
    (stepId: string, answer: string) => {
      if (!solutionPath) return;

      const nextAnswers = {
        ...selectedAnswers,
        [stepId]: answer,
      };

      setSelectedAnswers(nextAnswers);
      persistSession(solutionPath, problem || solutionPath.problem, {
        selectedAnswers: nextAnswers,
      });
    },
    [persistSession, problem, selectedAnswers, solutionPath]
  );

  const handleSubmitAttempt = useCallback(
    (stepId: string, fromHintReveal = false) => {
      if (!solutionPath) return;

      const step = stepMap.get(stepId);
      if (!step?.interactionPoint) return;

      const selectedAnswer = selectedAnswers[stepId] || undefined;
      const isDirectionCorrect =
        !step.interactionPoint.correctOption ||
        selectedAnswer === step.interactionPoint.correctOption ||
        fromHintReveal;

      const attempt: SolutionStepAttempt = {
        stepId,
        answer: selectedAnswer,
        isDirectionCorrect,
        knowledgeIds: [
          step.interactionPoint.mistakeKnowledgeId || step.knowledgePoints[0],
          ...step.knowledgePoints,
        ].filter(Boolean),
        recommendedLearningPathTargetId:
          step.interactionPoint.recommendedLearningPathTargetId ||
          step.interactionPoint.recommendedLearnTargetId,
        recommendedRecoveryNodeId:
          step.interactionPoint.recommendedRecoveryNodeId ||
          step.interactionPoint.mistakeKnowledgeId ||
          step.knowledgePoints[0],
        recommendedLearnTargetId: step.interactionPoint.recommendedLearnTargetId,
        recommendedLearnQuery: step.interactionPoint.recommendedLearnQuery,
        branchStepId: step.interactionPoint.branchStepId,
        submittedAt: new Date().toISOString(),
      };

      const nextAttempts = {
        ...attempts,
        [stepId]: attempt,
      };
      const nextStepStates = { ...stepStates };
      let nextActiveStepId = stepId;
      let nextHighlightedBranchIds = [...highlightedBranchStepIds];

      if (isDirectionCorrect) {
        nextStepStates[stepId] = "attempted";
        if (attempt.branchStepId) {
          nextHighlightedBranchIds = nextHighlightedBranchIds.filter(
            (item) => item !== attempt.branchStepId
          );
        }

        const currentMainIndex = mainSteps.findIndex((item) => item.id === stepId);
        const nextMainStep = currentMainIndex >= 0 ? mainSteps[currentMainIndex + 1] : undefined;
        if (nextMainStep && nextStepStates[nextMainStep.id] === "locked") {
          nextStepStates[nextMainStep.id] = "hinted";
          nextActiveStepId = nextMainStep.id;
        }
      } else {
        nextStepStates[stepId] = "offtrack";

        if (attempt.branchStepId) {
          nextStepStates[attempt.branchStepId] = "hinted";
          if (!nextHighlightedBranchIds.includes(attempt.branchStepId)) {
            nextHighlightedBranchIds.push(attempt.branchStepId);
          }
          nextActiveStepId = attempt.branchStepId;
        }

        startSolutionRecovery({
          problemKey: createProblemKey(problem || solutionPath.problem),
          knowledgeIds: attempt.knowledgeIds,
          recommendedLearningPathTargetId: attempt.recommendedLearningPathTargetId,
          recommendedRecoveryNodeId: attempt.recommendedRecoveryNodeId,
          recommendedLearnTargetId: attempt.recommendedLearnTargetId,
          recommendedLearnQuery: attempt.recommendedLearnQuery,
        });
      }

      setAttempts(nextAttempts);
      setStepStates(nextStepStates);
      setActiveStepId(nextActiveStepId);
      setHighlightedBranchStepIds(nextHighlightedBranchIds);

      persistSession(solutionPath, problem || solutionPath.problem, {
        attempts: nextAttempts,
        stepStates: nextStepStates,
        activeStepId: nextActiveStepId,
        highlightedBranchStepIds: nextHighlightedBranchIds,
      });
    },
    [
      attempts,
      highlightedBranchStepIds,
      mainSteps,
      persistSession,
      problem,
      selectedAnswers,
      solutionPath,
      startSolutionRecovery,
      stepMap,
      stepStates,
    ]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
          <Route className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">解题路径图</h1>
          <p className="text-sm text-slate-500">
            输入题目后生成题目画像、主干思维路径、易错分支与试一步互动。
          </p>
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <span className="badge bg-cyan-100 text-cyan-700">结构化生成</span>
          <span className="text-xs text-slate-400">
            后端会优先调用 AI 生成路径，超时或失败时自动回退到规则模板。
          </span>
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <textarea
              value={problem}
              onChange={(event) => setProblem(event.target.value)}
              placeholder="输入数学题目，例如：解不等式 x² - 3x + 2 < 0"
              className="input-field min-h-[80px] resize-none"
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  handleSolve();
                }
              }}
            />

            <div className="mt-3 flex items-center justify-between gap-4">
              <div className="space-y-2">
                <span className="block text-xs text-slate-400">
                  支持 LaTeX 语法，Ctrl+Enter 提交
                </span>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_PROBLEMS.map((example) => (
                    <button
                      key={example}
                      onClick={() => setProblem(example)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 transition-colors hover:border-cyan-200 hover:text-cyan-700"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap justify-end gap-2">
                {solutionPath && (
                  <button onClick={handleReset} className="btn-secondary px-4 py-2 text-sm">
                    <RotateCcw className="h-4 w-4" />
                    重置视图
                  </button>
                )}
                <button onClick={handleDemo} className="btn-secondary px-4 py-2 text-sm">
                  <Sparkles className="h-4 w-4" />
                  查看示例
                </button>
                <button
                  onClick={handleSolve}
                  disabled={!problem.trim() || loading}
                  className="btn-primary px-4 py-2 text-sm"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  生成路径图
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {solutionPath ? (
        <SolutionPathView
          path={solutionPath}
          problem={problem || solutionPath.problem}
          activeStepId={activeStepId}
          onSelectStep={handleSelectStep}
          stepStates={stepStates}
          selectedAnswers={selectedAnswers}
          attempts={attempts}
          highlightedBranchStepIds={highlightedBranchStepIds}
          onSelectAnswer={handleSelectAnswer}
          onSubmitAttempt={handleSubmitAttempt}
        />
      ) : (
        <EmptyState />
      )}
    </div>
  );
}

function SolutionPathView({
  path,
  problem,
  activeStepId,
  onSelectStep,
  stepStates,
  selectedAnswers,
  attempts,
  highlightedBranchStepIds,
  onSelectAnswer,
  onSubmitAttempt,
}: {
  path: SolutionPath;
  problem: string;
  activeStepId: string | null;
  onSelectStep: (stepId: string) => void;
  stepStates: Record<string, SolutionStepState>;
  selectedAnswers: Record<string, string | null>;
  attempts: Record<string, SolutionStepAttempt>;
  highlightedBranchStepIds: string[];
  onSelectAnswer: (stepId: string, answer: string) => void;
  onSubmitAttempt: (stepId: string, fromHintReveal?: boolean) => void;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeHintLevel, setActiveHintLevel] = useState(0);

  const mainSteps = useMemo(
    () => path.steps.filter((step) => step.branchType !== "mistake"),
    [path.steps]
  );

  const activeStep =
    path.steps.find((step) => step.id === activeStepId) || mainSteps[0] || path.steps[0];

  useEffect(() => {
    setActiveHintLevel(0);
  }, [activeStep?.id]);

  const branchMap = useMemo(() => {
    const map = new Map<string, SolutionStep[]>();
    path.steps
      .filter((step) => step.branchType === "mistake" && step.branchFromStepId)
      .forEach((step) => {
        const current = map.get(step.branchFromStepId!) || [];
        current.push(step);
        map.set(step.branchFromStepId!, current);
      });
    return map;
  }, [path.steps]);

  const flowNodes = useMemo<Node[]>(() => {
    const mainIndexMap = new Map(mainSteps.map((step, index) => [step.id, index]));

    return path.steps.map((step) => {
      const mainIndex =
        step.branchType === "mistake"
          ? mainIndexMap.get(step.branchFromStepId || "") || 0
          : mainIndexMap.get(step.id) || 0;
      const isHighlightedBranch =
        step.branchType === "mistake" && highlightedBranchStepIds.includes(step.id);

      return {
        id: step.id,
        type: "solutionStep",
        position:
          step.branchType === "mistake"
            ? { x: 620, y: mainIndex * 220 + 48 }
            : { x: 250, y: mainIndex * 220 },
        data: {
          title: step.title,
          content: step.content,
          stepType: step.type,
          isActive: activeStep?.id === step.id || isHighlightedBranch,
          onToggle: () => onSelectStep(step.id),
          stepState:
            isHighlightedBranch && stepStates[step.id] === "locked"
              ? "hinted"
              : stepStates[step.id] || "locked",
          branchType: step.branchType,
          branchRecoveryHint: step.branchRecoveryHint,
        } satisfies SolutionNodeData,
      };
    });
  }, [
    activeStep,
    highlightedBranchStepIds,
    mainSteps,
    onSelectStep,
    path.steps,
    stepStates,
  ]);

  const flowEdges = useMemo<Edge[]>(
    () =>
      path.edges.map((edge, index) => ({
        id: `${edge.source}-${edge.target}-${index}`,
        source: edge.source,
        target: edge.target,
        animated: edge.type !== "return_main",
        style:
          edge.type === "mistake_branch"
            ? { stroke: "#f97316", strokeWidth: 2, strokeDasharray: "6 4" }
            : edge.type === "return_main"
              ? { stroke: "#fb923c", strokeWidth: 1.5 }
              : { stroke: "#818cf8", strokeWidth: 2 },
        label: edge.label,
        labelStyle: {
          fontSize: 11,
          fill:
            edge.type === "mistake_branch"
              ? "#ea580c"
              : edge.type === "return_main"
                ? "#c2410c"
                : "#94a3b8",
        },
      })),
    [path.edges]
  );

  const attemptedSteps = mainSteps.filter(
    (step) => stepStates[step.id] === "attempted"
  ).length;
  const offtrackSteps = mainSteps.filter(
    (step) => stepStates[step.id] === "offtrack"
  ).length;

  const relatedKnowledge = useMemo(
    () => path.relatedKnowledge.map((id) => getKnowledgeNode(id)).filter(Boolean),
    [path.relatedKnowledge]
  );

  const stepTypes = useMemo(() => {
    const types = new Set(mainSteps.map((step) => step.type));
    return Array.from(types) as SolutionStepType[];
  }, [mainSteps]);

  const activeMainStep = activeStep?.branchType === "mistake" ? undefined : activeStep;
  const activeBranches =
    activeStep?.branchType === "mistake"
      ? [activeStep]
      : branchMap.get(activeStep?.id || "") || [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="glass-card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-cyan-500" />
            <h2 className="text-base font-bold text-slate-900">题目画像</h2>
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="badge bg-cyan-100 text-cyan-700">{path.portrait.stage}</span>
            <span className="badge bg-indigo-100 text-indigo-700">
              {path.portrait.problemType}
            </span>
            <span className="badge bg-slate-100 text-slate-600">
              难度 {"★".repeat(path.portrait.difficulty)}
              {"☆".repeat(5 - path.portrait.difficulty)}
            </span>
          </div>
          <div className="mb-2 text-lg font-semibold text-slate-800">
            <MathText text={problem} />
          </div>
          <div className="text-sm text-slate-500">
            <MathText text={path.summary} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                涉及知识点
              </div>
              <div className="flex flex-wrap gap-2">
                {path.portrait.knowledgePoints.map((item) => (
                  <span
                    key={item.id}
                    className="badge"
                    style={{
                      backgroundColor: `${CATEGORY_COLORS[item.category]}15`,
                      color: CATEGORY_COLORS[item.category],
                    }}
                  >
                    {CATEGORY_LABELS[item.category]} · {item.name}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                前置能力
              </div>
              <div className="space-y-2">
                {path.portrait.prerequisites.map((item) => (
                  <div key={item.id} className="text-sm text-slate-600">
                    <span className="font-semibold text-slate-800">{item.name}</span>
                    <span className="text-slate-500">
                      {" "}
                      · <MathText text={item.why} />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <MetricCard label="主干节点" value={String(mainSteps.length)} />
          <MetricCard label="已走对方向" value={String(attemptedSteps)} />
          <MetricCard label="偏离次数" value={String(offtrackSteps)} compact />
        </div>
      </div>

      <div className="glass-card p-5">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span className="badge bg-emerald-100 text-emerald-700">
                <Footprints className="h-3 w-3" />
                主干 {attemptedSteps}/{mainSteps.length} 步已走通
              </span>
              {offtrackSteps > 0 && (
                <span className="badge bg-orange-100 text-orange-700">
                  <AlertTriangle className="h-3 w-3" />
                  已触发 {offtrackSteps} 次易错分支
                </span>
              )}
            </div>
            <div className="text-sm text-slate-500">
              当前选中：
              <span className="ml-1 font-semibold text-slate-800">{activeStep?.title}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div
          className="relative transition-all duration-300"
          style={{
            height: "720px",
            flex: sidebarOpen ? "1 1 0%" : "1 1 100%",
          }}
        >
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => onSelectStep(node.id)}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.3}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
          >
            <Controls />
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#e2e8f0" />
          </ReactFlow>

          <button
            onClick={() => setSidebarOpen((value) => !value)}
            className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 shadow-sm hover:bg-slate-50"
          >
            {sidebarOpen ? (
              <>
                <PanelRightClose className="h-4 w-4" />
                收起引导
              </>
            ) : (
              <>
                <PanelRightOpen className="h-4 w-4" />
                展开引导
              </>
            )}
          </button>
        </div>

        {sidebarOpen && (
          <div className="guide-sidebar shrink-0 animate-slide-in" style={{ width: 340 }}>
            {activeStep?.branchType === "mistake" ? (
              <>
                <div className="guide-section">
                  <div className="guide-section-title">⚠️ 易错分支</div>
                  <div className="mb-1 text-sm font-semibold text-orange-700">
                    {activeStep.title}
                  </div>
                  <div className="text-xs leading-relaxed text-slate-600">
                    <MathText text={activeStep.explanation} />
                  </div>
                </div>

                {activeStep.branchRecoveryHint && (
                  <div className="guide-section">
                    <div className="guide-section-title">↩ 回到主线</div>
                    <div className="text-xs text-orange-700">
                      <MathText text={activeStep.branchRecoveryHint} />
                    </div>
                  </div>
                )}

                <div className="guide-section">
                  <div className="guide-section-title">📚 关联薄弱点</div>
                  <div className="space-y-2">
                    {activeStep.knowledgePoints.map((id) => {
                      const node = getKnowledgeNode(id);
                      return node ? (
                        <div key={id} className="text-sm text-slate-700">
                          <span className="font-semibold">{node.name}</span>
                          <span className="text-slate-500">
                            {" "}
                            · {CATEGORY_LABELS[node.category]}
                          </span>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              </>
            ) : (
              <>
                {activeMainStep && (
                  <div className="guide-section">
                    <div className="guide-section-title">🎯 当前主节点</div>
                    <div className="mb-1 text-sm font-semibold text-slate-800">
                      {activeMainStep.title}
                    </div>
                    <div className="text-xs leading-relaxed text-slate-600">
                      <MathText text={activeMainStep.explanation} />
                    </div>
                  </div>
                )}

                {activeMainStep?.interactionPoint && (
                  <div className="guide-section">
                    <div className="guide-section-title">📝 我来试一步</div>
                    <StepInteractionPanel
                      step={activeMainStep}
                      stepState={stepStates[activeMainStep.id] || "locked"}
                      selectedAnswer={selectedAnswers[activeMainStep.id] || null}
                      submittedAttempt={attempts[activeMainStep.id]}
                      onSelectAnswer={(answer) => onSelectAnswer(activeMainStep.id, answer)}
                      onSubmitAttempt={() => onSubmitAttempt(activeMainStep.id)}
                      onRevealHint={() => onSubmitAttempt(activeMainStep.id, true)}
                    />
                  </div>
                )}

                <div className="guide-section">
                  <div className="guide-section-title">📋 题型识别</div>
                  <div className="mb-1 text-sm font-semibold text-slate-800">
                    {path.guide?.problemType || path.portrait.problemType}
                  </div>
                  <div className="text-xs leading-relaxed text-slate-500">
                    <MathText
                      text={
                        path.guide?.typeExplanation ||
                        "先判断题型，再决定主方法和检查点。"
                      }
                    />
                  </div>
                </div>

                <div className="guide-section">
                  <div className="guide-section-title">📚 当前节点前置能力</div>
                  <div className="space-y-2">
                    {path.portrait.prerequisites.map((item) => (
                      <div key={item.id} className="flex items-start gap-2 text-xs">
                        <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-400" />
                        <div>
                          <span className="font-semibold text-slate-700">{item.name}</span>
                          <span className="text-slate-500">
                            {" "}
                            · <MathText text={item.why} />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {path.guide && (
                  <div className="guide-section">
                    <div className="guide-section-title">💡 分步提示</div>
                    <div className="space-y-1.5">
                      {path.guide.stepHints.map((hint, index) => (
                        <div key={index} className="flex items-start gap-2">
                          {index <= activeHintLevel ? (
                            <div className="flex items-start gap-2 text-xs animate-fade-in">
                              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">
                                {index + 1}
                              </span>
                              <span className="text-slate-600">
                                <MathText text={hint} />
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-slate-300">
                              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-400">
                                {index + 1}
                              </span>
                              <span>· · ·</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {activeHintLevel < path.guide.stepHints.length - 1 ? (
                      <button
                        onClick={() => setActiveHintLevel((value) => value + 1)}
                        className="mt-3 flex items-center gap-1 text-xs font-medium text-indigo-500 hover:text-indigo-700"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        显示下一步提示
                      </button>
                    ) : (
                      <button
                        onClick={() => setActiveHintLevel(0)}
                        className="mt-3 flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-slate-600"
                      >
                        <EyeOff className="h-3.5 w-3.5" />
                        收起提示
                      </button>
                    )}
                  </div>
                )}

                <div className="guide-section">
                  <div className="guide-section-title">⚠️ 当前节点易错分支</div>
                  {activeBranches.length > 0 ? (
                    <div className="space-y-2">
                      {activeBranches.map((branch) => (
                        <button
                          key={branch.id}
                          onClick={() => onSelectStep(branch.id)}
                          className="w-full rounded-xl bg-orange-50 px-3 py-3 text-left text-xs text-orange-700 hover:bg-orange-100"
                        >
                          <div className="font-semibold">{branch.title}</div>
                          <div className="mt-1">
                            <MathText text={branch.branchRecoveryHint || branch.explanation} />
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">
                      当前节点没有额外易错分支，继续沿主线推进即可。
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="glass-card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
            <BookOpen className="h-4 w-4 text-slate-400" />
            步骤类型
          </h3>
          <div className="flex flex-wrap gap-2">
            {stepTypes.map((type) => (
              <span
                key={type}
                className="badge"
                style={{
                  backgroundColor: `${STEP_TYPE_COLORS[type]}15`,
                  color: STEP_TYPE_COLORS[type],
                }}
              >
                {STEP_TYPE_LABELS[type]}
              </span>
            ))}
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
            <ChevronRight className="h-4 w-4 text-slate-400" />
            涉及知识点
          </h3>
          <div className="flex flex-wrap gap-2">
            {relatedKnowledge.map((node) =>
              node ? (
                <span
                  key={node.id}
                  className="badge"
                  style={{
                    backgroundColor: `${CATEGORY_COLORS[node.category]}15`,
                    color: CATEGORY_COLORS[node.category],
                  }}
                >
                  {CATEGORY_LABELS[node.category]} · {node.name}
                </span>
              ) : null
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className="glass-card p-4 text-center">
      <div className={`font-bold text-slate-900 ${compact ? "text-base" : "text-2xl"}`}>
        {value}
      </div>
      <div className="mt-1 text-xs text-slate-500">{label}</div>
    </div>
  );
}

function StepInteractionPanel({
  step,
  stepState,
  selectedAnswer,
  submittedAttempt,
  onSelectAnswer,
  onSubmitAttempt,
  onRevealHint,
}: {
  step: SolutionStep;
  stepState: SolutionStepState;
  selectedAnswer: string | null;
  submittedAttempt?: SolutionStepAttempt;
  onSelectAnswer: (answer: string) => void;
  onSubmitAttempt: () => void;
  onRevealHint: () => void;
}) {
  const interactionPoint = step.interactionPoint;
  if (!interactionPoint) {
    return null;
  }

  const isRetrying = stepState === "offtrack";
  const isAttemptLocked = Boolean(submittedAttempt) && !isRetrying;
  const feedbackText = submittedAttempt
    ? submittedAttempt.isDirectionCorrect
      ? interactionPoint.correctFeedback || interactionPoint.hint
      : interactionPoint.wrongFeedback || interactionPoint.hint
    : undefined;

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-indigo-50 px-3 py-3 text-sm text-slate-700">
        <div className="font-medium text-indigo-700">
          <MathText text={interactionPoint.question} />
        </div>
      </div>

      {interactionPoint.options ? (
        <div className="space-y-1.5">
          {interactionPoint.options.map((option) => (
            <button
              key={option}
              className={`interaction-option ${selectedAnswer === option ? "selected" : ""}`}
              onClick={() => onSelectAnswer(option)}
              disabled={isAttemptLocked}
            >
              <MathText text={option} />
            </button>
          ))}
        </div>
      ) : !submittedAttempt ? (
        <button className="interaction-option" onClick={onRevealHint}>
          想好了，看提示
        </button>
      ) : null}

      {interactionPoint.options && selectedAnswer && !isAttemptLocked && (
        <button className="btn-primary px-3 py-2 text-xs" onClick={onSubmitAttempt}>
          <Send className="h-3.5 w-3.5" />
          提交这一步
        </button>
      )}

      {feedbackText && (
        <div
          className="hint-reveal"
          style={
            submittedAttempt?.isDirectionCorrect
              ? undefined
              : {
                  background: "linear-gradient(135deg, #fff7ed, #fffbeb)",
                  borderColor: "#fdba74",
                  color: "#c2410c",
                }
          }
        >
          <span className="font-semibold">
            {submittedAttempt?.isDirectionCorrect ? "方向正确：" : "方向偏离："}
          </span>
          <MathText text={feedbackText} />
        </div>
      )}

      {!interactionPoint.options && !submittedAttempt && (
        <div className="text-xs text-slate-500">
          当前节点不要求选择答案，点击上方按钮即可按提示校准方向。
        </div>
      )}
    </div>
  );
}
