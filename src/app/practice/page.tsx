"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ClipboardCheck,
  ChevronRight,
  Lightbulb,
  CheckCircle,
  XCircle,
  RotateCcw,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertTriangle,
  BookOpen,
  Zap,
  Target,
  Play,
  ArrowLeftCircle,
  RefreshCw,
} from "lucide-react";
import { DiagnosticNode } from "@/components/graph/diagnostic-node";
import type { DiagnosticNodeData } from "@/components/graph/diagnostic-node";
import { MathText } from "@/components/ui/math-renderer";
import {
  getLearnHref,
  getMockDiagnosisByQuestionId,
  mockQuestions,
} from "@/lib/mock-data";
import { getKnowledgeNode } from "@/lib/knowledge-graph";
import { useAppStore } from "@/lib/store";
import type { PracticeQuestion, DiagnosticResult, MicroExercise } from "@/types";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  ERROR_CATEGORY_COLORS,
  ERROR_CATEGORY_LABELS,
} from "@/types";

const nodeTypes = { diagnosticNode: DiagnosticNode };

export default function PracticePage() {
  const router = useRouter();
  const [currentQuestion, setCurrentQuestion] = useState<PracticeQuestion>(
    mockQuestions[0]
  );
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [showHints, setShowHints] = useState(false);
  const [hintLevel, setHintLevel] = useState(0);
  const [diagnosis, setDiagnosis] = useState<DiagnosticResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);

  const { updateMastery, addPracticeRecord, getMastery } = useAppStore();

  const handleSubmit = useCallback(async () => {
    if (!selectedAnswer) return;
    setLoading(true);
    setSubmitted(true);

    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;

    // Update mastery for related knowledge points
    for (const kp of currentQuestion.knowledgePoints) {
      updateMastery(kp, isCorrect);
    }

    // Add practice record
    addPracticeRecord({
      questionId: currentQuestion.id,
      answer: selectedAnswer,
      isCorrect,
      timestamp: new Date().toISOString(),
    });

    if (!isCorrect) {
      try {
        const res = await fetch("/api/diagnose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: currentQuestion,
            studentAnswer: selectedAnswer,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setDiagnosis(data);
        } else {
          setDiagnosis(getMockDiagnosisByQuestionId(currentQuestion.id, selectedAnswer) || null);
        }
      } catch {
        setDiagnosis(getMockDiagnosisByQuestionId(currentQuestion.id, selectedAnswer) || null);
      }
    }

    setLoading(false);
  }, [selectedAnswer, currentQuestion, updateMastery, addPracticeRecord]);

  const handleNext = useCallback(() => {
    const nextIdx = (questionIndex + 1) % mockQuestions.length;
    setQuestionIndex(nextIdx);
    setCurrentQuestion(mockQuestions[nextIdx]);
    setSelectedAnswer(null);
    setSubmitted(false);
    setShowHints(false);
    setHintLevel(0);
    setDiagnosis(null);
  }, [questionIndex]);

  const handleReset = useCallback(() => {
    setSelectedAnswer(null);
    setSubmitted(false);
    setShowHints(false);
    setHintLevel(0);
    setDiagnosis(null);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-white">
          <ClipboardCheck className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">练习诊断</h1>
          <p className="text-sm text-slate-500">
            提交作答后返回错因定位、回补练习和回测闭环。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Question & Answer */}
        <div className="lg:col-span-2 space-y-5">
          {/* Question Card */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="badge bg-indigo-100 text-indigo-700">
                第 {questionIndex + 1}/{mockQuestions.length} 题
              </span>
              <span className="badge bg-slate-100 text-slate-600">
                难度 {"★".repeat(currentQuestion.difficulty)}
                {"☆".repeat(5 - currentQuestion.difficulty)}
              </span>
              <div className="flex gap-1 ml-auto">
                {currentQuestion.knowledgePoints.map((kp) => {
                  const kn = getKnowledgeNode(kp);
                  return kn ? (
                    <span
                      key={kp}
                      className="badge text-[11px]"
                      style={{
                        backgroundColor: `${CATEGORY_COLORS[kn.category]}15`,
                        color: CATEGORY_COLORS[kn.category],
                      }}
                    >
                      {kn.name}
                    </span>
                  ) : null;
                })}
              </div>
            </div>

            <div className="text-lg text-slate-800 leading-relaxed mb-6">
              <MathText text={currentQuestion.problem} />
            </div>

            {/* Options */}
            {currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.map((opt, i) => {
                  const letter = String.fromCharCode(65 + i);
                  const isSelected = selectedAnswer === opt;
                  const isCorrect =
                    submitted && opt === currentQuestion.correctAnswer;
                  const isWrong = submitted && isSelected && !isCorrect;

                  return (
                    <button
                      key={i}
                      onClick={() => !submitted && setSelectedAnswer(opt)}
                      disabled={submitted}
                      className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                        isCorrect
                          ? "border-green-400 bg-green-50"
                          : isWrong
                          ? "border-red-400 bg-red-50"
                          : isSelected
                          ? "border-indigo-400 bg-indigo-50"
                          : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold ${
                          isCorrect
                            ? "bg-green-500 text-white"
                            : isWrong
                            ? "bg-red-500 text-white"
                            : isSelected
                            ? "bg-indigo-500 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {isCorrect ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : isWrong ? (
                          <XCircle className="w-4 h-4" />
                        ) : (
                          letter
                        )}
                      </div>
                      <span className="text-sm text-slate-700 flex-1">
                        <MathText text={opt} />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 mt-6 pt-4 border-t border-slate-100">
              {!submitted ? (
                <>
                  <button
                    onClick={() => {
                      setShowHints(!showHints);
                      if (!showHints) setHintLevel(0);
                    }}
                    className="btn-secondary text-sm py-2 px-4"
                  >
                    {showHints ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                    {showHints ? "隐藏提示" : "获取提示"}
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={handleSubmit}
                    disabled={!selectedAnswer || loading}
                    className="btn-primary text-sm py-2 px-4"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                    提交答案
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleReset}
                    className="btn-secondary text-sm py-2 px-4"
                  >
                    <RotateCcw className="w-4 h-4" />
                    重新作答
                  </button>
                  <div className="flex-1" />
                  {diagnosis ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          // 滚动到诊断区域的第四段
                          document.getElementById("diagnosis-section-4")?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="btn-primary text-sm py-2 px-4"
                      >
                        <Play className="w-4 h-4" />
                        开始补救练习
                      </button>
                      <button
                        onClick={() =>
                          router.push(
                            diagnosis.recommendedLearnTargetId
                              ? getLearnHref(
                                  diagnosis.recommendedLearnTargetId,
                                  diagnosis.recommendedLearnQuery
                                )
                              : "/learn"
                          )
                        }
                        className="btn-secondary text-sm py-2 px-4"
                      >
                        <ArrowLeftCircle className="w-4 h-4" />
                        回到前置知识
                      </button>
                      <button
                        onClick={handleNext}
                        className="btn-secondary text-sm py-2 px-4"
                      >
                        <RefreshCw className="w-4 h-4" />
                        再做一题验证
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleNext}
                      className="btn-primary text-sm py-2 px-4"
                    >
                      下一题
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Hints */}
          {showHints && !submitted && (
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-700">解题提示</h3>
                <span className="text-xs text-slate-400">
                  (已显示 {Math.min(hintLevel + 1, currentQuestion.hints.length)}/{currentQuestion.hints.length})
                </span>
              </div>
              <div className="space-y-2">
                {currentQuestion.hints.slice(0, hintLevel + 1).map((hint, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 text-sm text-slate-600 animate-fade-in"
                  >
                    <span className="badge bg-amber-100 text-amber-700 shrink-0">
                      {i + 1}
                    </span>
                    <MathText text={hint} />
                  </div>
                ))}
              </div>
              {hintLevel < currentQuestion.hints.length - 1 && (
                <button
                  onClick={() => setHintLevel(hintLevel + 1)}
                  className="text-sm text-amber-600 hover:text-amber-700 mt-3 font-medium"
                >
                  显示下一步提示 →
                </button>
              )}
            </div>
          )}

          {/* Diagnosis result */}
          {submitted && diagnosis && (
            <DiagnosisView diagnosis={diagnosis} />
          )}

          {/* Correct answer feedback */}
          {submitted && !diagnosis && selectedAnswer === currentQuestion.correctAnswer && (
            <div className="glass-card p-5 border-2 border-green-200 bg-green-50/50">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <h3 className="text-lg font-bold text-green-700">回答正确！</h3>
              </div>
              <p className="text-sm text-green-600">
                很好！你掌握了相关知识点，可以继续下一题。
              </p>
            </div>
          )}
        </div>

        {/* Right: Question navigation */}
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-3">题目列表</h3>
            <div className="grid grid-cols-5 gap-2">
              {mockQuestions.map((q, i) => (
                <button
                  key={q.id}
                  onClick={() => {
                    setQuestionIndex(i);
                    setCurrentQuestion(q);
                    setSelectedAnswer(null);
                    setSubmitted(false);
                    setShowHints(false);
                    setHintLevel(0);
                    setDiagnosis(null);
                  }}
                  className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${
                    i === questionIndex
                      ? "bg-indigo-500 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              系统说明
            </h3>
            <div className="space-y-3 text-sm text-slate-500">
              <p>
                <span className="font-medium text-slate-700">诊断闭环：</span>
                答错后会生成“错因 → 回补 → 回测”的完整结构化反馈。
              </p>
              <p>
                <span className="font-medium text-slate-700">回溯路径：</span>
                诊断会直接指向对应学习路径，回到前置知识页可继续推进。
              </p>
              <p>
                <span className="font-medium text-slate-700">渐进提示：</span>
                每道题提供分层提示，逐步引导你独立思考。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 四段式诊断视图
// ============================================================

function DiagnosisView({ diagnosis }: { diagnosis: DiagnosticResult }) {
  const getMastery = useAppStore((s) => s.getMastery);

  // 微练习答题状态
  const [microAnswers, setMicroAnswers] = useState<Record<string, string | null>>({});
  const [microSubmitted, setMicroSubmitted] = useState<Record<string, boolean>>({});
  const [retestAnswer, setRetestAnswer] = useState<string | null>(null);
  const [retestSubmitted, setRetestSubmitted] = useState(false);

  const handleMicroSelect = (exerciseId: string, answer: string) => {
    if (microSubmitted[exerciseId]) return;
    setMicroAnswers((prev) => ({ ...prev, [exerciseId]: answer }));
  };

  const handleMicroSubmit = (exerciseId: string) => {
    setMicroSubmitted((prev) => ({ ...prev, [exerciseId]: true }));
  };

  const handleRetestSelect = (answer: string) => {
    if (retestSubmitted) return;
    setRetestAnswer(answer);
  };

  const handleRetestSubmit = () => {
    setRetestSubmitted(true);
  };

  const allMicroSubmitted = diagnosis.microExercises.every(
    (exercise) => microSubmitted[exercise.id]
  );

  // 构建回溯路径图
  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // 前置知识节点
    diagnosis.prerequisitesToFix.forEach((prereq, i) => {
      const kn = getKnowledgeNode(prereq.id);
      nodes.push({
        id: `prereq-${prereq.id}`,
        type: "diagnosticNode",
        position: { x: i * 260, y: 0 },
        data: {
          label: prereq.name,
          status: "missing",
          detail: prereq.reason,
        } satisfies DiagnosticNodeData,
      });
    });

    // 回溯路径中其他节点
    const prereqIds = new Set(diagnosis.prerequisitesToFix.map((p) => p.id));
    const otherNodes = diagnosis.backtrackPath.filter((id) => !prereqIds.has(id));

    otherNodes.forEach((id, i) => {
      const kn = getKnowledgeNode(id);
      if (!kn) return;
      const mastery = getMastery(id);
      const status = mastery === "high" || mastery === "full" ? "correct" : "review";

      nodes.push({
        id: `bt-${id}`,
        type: "diagnosticNode",
        position: { x: i * 220 + 50, y: 140 },
        data: {
          label: kn.name,
          status,
          detail: kn.description,
        } satisfies DiagnosticNodeData,
      });

      // 连接到前置知识节点
      const parentPrereq = diagnosis.prerequisitesToFix.find((p) => {
        const pNode = getKnowledgeNode(p.id);
        return pNode?.prerequisites.includes(id);
      });
      if (parentPrereq) {
        edges.push({
          id: `e-${id}-${parentPrereq.id}`,
          source: `bt-${id}`,
          target: `prereq-${parentPrereq.id}`,
          style: { stroke: "#3b82f6", strokeWidth: 2 },
        });
      }
    });

    return { nodes, edges };
  }, [diagnosis, getMastery]);

  const [nodes, , onNodesChange] = useNodesState(flowNodes);
  const [edges, , onEdgesChange] = useEdgesState(flowEdges);

  const categoryColor = ERROR_CATEGORY_COLORS[diagnosis.errorCategory] || "#64748b";

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ================================================ */}
      {/* 第一段：你错在哪里 */}
      {/* ================================================ */}
      <div className="diagnosis-section diagnosis-section-1">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500 text-white text-xs font-bold">1</div>
          <h3 className="text-base font-bold text-red-700">你错在哪里</h3>
        </div>
        <div className="text-sm text-slate-800 leading-relaxed">
          <MathText text={diagnosis.errorPinpoint} />
        </div>
        {diagnosis.errorStep && (
          <div className="mt-3 pl-3 border-l-2 border-red-200 text-sm text-slate-600">
            <span className="font-medium text-red-600">关键步骤：</span>
            <MathText text={diagnosis.errorStep} />
          </div>
        )}
      </div>

      {/* ================================================ */}
      {/* 第二段：为什么会错 */}
      {/* ================================================ */}
      <div className="diagnosis-section diagnosis-section-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-white text-xs font-bold">2</div>
          <h3 className="text-base font-bold text-amber-700">为什么会错</h3>
          <span
            className="error-category-badge"
            style={{ backgroundColor: `${categoryColor}15`, color: categoryColor, borderColor: `${categoryColor}30` }}
          >
            {diagnosis.errorCategoryLabel}
          </span>
        </div>
        <div className="text-sm text-slate-700 leading-relaxed">
          <MathText text={diagnosis.whyWrong} />
        </div>
      </div>

      {/* ================================================ */}
      {/* 第三段：要补哪一层 */}
      {/* ================================================ */}
      <div className="diagnosis-section diagnosis-section-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500 text-white text-xs font-bold">3</div>
          <h3 className="text-base font-bold text-blue-700">要补哪一层</h3>
          <span className="text-xs text-slate-400 ml-auto">
            {diagnosis.prerequisitesToFix.length} 个前置知识点
          </span>
        </div>

        <div className="grid gap-3 mb-4">
          {diagnosis.prerequisitesToFix.map((prereq) => {
            const kn = getKnowledgeNode(prereq.id);
            return (
              <div key={prereq.id} className="prereq-card">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="text-sm font-bold text-slate-800">{prereq.name}</span>
                  {kn && (
                    <span
                      className="badge text-[10px]"
                      style={{
                        backgroundColor: `${CATEGORY_COLORS[kn.category]}15`,
                        color: CATEGORY_COLORS[kn.category],
                      }}
                    >
                      {CATEGORY_LABELS[kn.category]}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 ml-6">
                  <MathText text={prereq.reason} />
                </p>
              </div>
            );
          })}
        </div>

        {/* 迷你回溯图 */}
        {flowNodes.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-slate-200/60" style={{ height: "220px" }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.5 }}
              minZoom={0.4}
              maxZoom={1.2}
              proOptions={{ hideAttribution: true }}
            >
              <Controls showInteractive={false} />
              <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e2e8f0" />
            </ReactFlow>
          </div>
        )}
      </div>

      {/* ================================================ */}
      {/* 第四段：现在就补 */}
      {/* ================================================ */}
      <div className="diagnosis-section diagnosis-section-4" id="diagnosis-section-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500 text-white text-xs font-bold">4</div>
          <h3 className="text-base font-bold text-green-700">现在就补</h3>
          <Zap className="w-4 h-4 text-green-500" />
        </div>
        {diagnosis.recoveryTitle && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <MathText text={diagnosis.recoveryTitle} />
          </div>
        )}

        {/* 超短讲解 */}
        <div className="mini-lesson-card mb-5">
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-4 h-4 text-green-600" />
            <span className="text-sm font-bold text-green-800">核心精讲</span>
          </div>
          <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
            <MathText text={diagnosis.miniLesson} />
          </div>
        </div>

        {/* 微练习 */}
        <div className="space-y-4 mb-5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-bold text-slate-700">针对微练习</span>
            <span className="text-xs text-slate-400">做完才能回测</span>
          </div>

          {diagnosis.microExercises.map((ex, idx) => (
            <MicroExerciseCard
              key={ex.id}
              exercise={ex}
              index={idx + 1}
              selectedAnswer={microAnswers[ex.id] || null}
              submitted={!!microSubmitted[ex.id]}
              onSelect={(ans) => handleMicroSelect(ex.id, ans)}
              onSubmit={() => handleMicroSubmit(ex.id)}
            />
          ))}
        </div>

        {/* 回测题 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-bold text-slate-700">回测验证</span>
            <span className="text-xs text-slate-400">与原题结构相同，数值不同</span>
          </div>

          <MicroExerciseCard
            exercise={diagnosis.retestQuestion}
            index={0}
            label="回测"
            selectedAnswer={retestAnswer}
            submitted={retestSubmitted}
            onSelect={handleRetestSelect}
            onSubmit={handleRetestSubmit}
            disabled={!allMicroSubmitted}
          />
          {!allMicroSubmitted && (
            <div className="mt-3 text-xs text-slate-500">
              先完成上面的 2 道微练习，再进入回测验证。
            </div>
          )}

          {retestSubmitted && retestAnswer === diagnosis.retestQuestion.correctAnswer && (
            <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-green-50 border border-green-200">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-sm font-bold text-green-700">回测通过！你已经掌握了这个知识点。</span>
            </div>
          )}
          {retestSubmitted && retestAnswer !== diagnosis.retestQuestion.correctAnswer && (
            <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <span className="text-sm text-amber-700">还需要再巩固一下，建议回到前置知识重新学习。</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 微练习 / 回测题 卡片组件
// ============================================================

function MicroExerciseCard({
  exercise,
  index,
  label,
  selectedAnswer,
  submitted,
  onSelect,
  onSubmit,
  disabled = false,
}: {
  exercise: MicroExercise;
  index: number;
  label?: string;
  selectedAnswer: string | null;
  submitted: boolean;
  onSelect: (answer: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  const isCorrect = submitted && selectedAnswer === exercise.correctAnswer;
  const isWrong = submitted && selectedAnswer !== exercise.correctAnswer;

  return (
    <div className={`micro-exercise-card ${isCorrect ? "micro-correct" : isWrong ? "micro-wrong" : ""}`}>
      <div className="flex items-start gap-2 mb-3">
        <span className={`badge text-xs shrink-0 ${isCorrect ? "bg-green-100 text-green-700" : isWrong ? "bg-red-100 text-red-700" : "bg-indigo-100 text-indigo-700"}`}>
          {label || `微练 ${index}`}
        </span>
        <div className="text-sm text-slate-700 flex-1">
          <MathText text={exercise.problem} />
        </div>
      </div>

      {exercise.options && (
        <div className="space-y-2 mb-3">
          {exercise.options.map((opt, i) => {
            const letter = String.fromCharCode(65 + i);
            const isSelected = selectedAnswer === opt;
            const optCorrect = submitted && opt === exercise.correctAnswer;
            const optWrong = submitted && isSelected && opt !== exercise.correctAnswer;

            return (
              <button
                key={i}
                onClick={() => onSelect(opt)}
                disabled={submitted || disabled}
                className={`micro-exercise-option ${
                  optCorrect
                    ? "border-green-400 bg-green-50"
                    : optWrong
                    ? "border-red-400 bg-red-50"
                    : isSelected
                    ? "border-indigo-400 bg-indigo-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <span className={`micro-option-letter ${
                  optCorrect
                    ? "bg-green-500 text-white"
                    : optWrong
                    ? "bg-red-500 text-white"
                    : isSelected
                    ? "bg-indigo-500 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}>
                  {optCorrect ? "\u2713" : optWrong ? "\u2717" : letter}
                </span>
                <span className="text-sm text-slate-700 flex-1">
                  <MathText text={opt} />
                </span>
              </button>
            );
          })}
        </div>
      )}

      {!submitted && selectedAnswer && (
        <button onClick={onSubmit} disabled={disabled} className="btn-primary text-xs py-1.5 px-3">
          <CheckCircle className="w-3.5 h-3.5" />
          确认
        </button>
      )}

      {submitted && (
        <div className="mt-2 text-xs text-slate-500">
          <span className="font-medium">设计意图：</span>
          <MathText text={exercise.purpose} />
        </div>
      )}
    </div>
  );
}
