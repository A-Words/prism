"use client";

import { useState, useCallback, useMemo } from "react";
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
} from "lucide-react";
import { DiagnosticNode } from "@/components/graph/diagnostic-node";
import type { DiagnosticNodeData } from "@/components/graph/diagnostic-node";
import { MathText } from "@/components/ui/math-renderer";
import { mockQuestions, mockDiagnosis } from "@/lib/mock-data";
import { getKnowledgeNode, getAllPrerequisites } from "@/lib/knowledge-graph";
import { useAppStore } from "@/lib/store";
import type { PracticeQuestion, DiagnosticResult } from "@/types";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
} from "@/types";

const nodeTypes = { diagnosticNode: DiagnosticNode };

export default function PracticePage() {
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
          // Use mock diagnosis
          setDiagnosis(mockDiagnosis);
        }
      } catch {
        setDiagnosis(mockDiagnosis);
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
            智能诊断薄弱环节，动态回溯前置知识
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
                  <button
                    onClick={handleNext}
                    className="btn-primary text-sm py-2 px-4"
                  >
                    下一题
                    <ArrowRight className="w-4 h-4" />
                  </button>
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
                <span className="font-medium text-slate-700">智能诊断：</span>
                答错后，AI 将分析你的错误原因，精确定位薄弱知识点。
              </p>
              <p>
                <span className="font-medium text-slate-700">回溯路径：</span>
                系统自动追溯到需要补强的前置知识，生成回溯路径图。
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

function DiagnosisView({ diagnosis }: { diagnosis: DiagnosticResult }) {
  const getMastery = useAppStore((s) => s.getMastery);

  // Build diagnostic graph
  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Error node at top
    nodes.push({
      id: "error",
      type: "diagnosticNode",
      position: { x: 200, y: 0 },
      data: {
        label: "答案错误",
        status: "error",
        detail: diagnosis.errorAnalysis,
      } satisfies DiagnosticNodeData,
    });

    // Missing knowledge nodes
    diagnosis.missingKnowledge.forEach((id, i) => {
      const kn = getKnowledgeNode(id);
      if (!kn) return;

      nodes.push({
        id: `missing-${id}`,
        type: "diagnosticNode",
        position: { x: i * 250, y: 150 },
        data: {
          label: kn.name,
          status: "missing",
          detail: `${CATEGORY_LABELS[kn.category]} · ${kn.description}`,
        } satisfies DiagnosticNodeData,
      });

      edges.push({
        id: `e-error-${id}`,
        source: "error",
        target: `missing-${id}`,
        animated: true,
        style: { stroke: "#f59e0b", strokeWidth: 2 },
      });
    });

    // Backtrack path nodes
    const backtrackNodes = diagnosis.backtrackPath.filter(
      (id) => !diagnosis.missingKnowledge.includes(id)
    );

    backtrackNodes.forEach((id, i) => {
      const kn = getKnowledgeNode(id);
      if (!kn) return;

      const mastery = getMastery(id);
      const status = mastery === "high" || mastery === "full" ? "correct" : "review";

      nodes.push({
        id: `bt-${id}`,
        type: "diagnosticNode",
        position: { x: i * 220 + 50, y: 320 },
        data: {
          label: kn.name,
          status,
          detail: kn.description,
        } satisfies DiagnosticNodeData,
      });

      // Connect to parent missing knowledge
      const parentMissing = diagnosis.missingKnowledge.find((mid) => {
        const mNode = getKnowledgeNode(mid);
        return mNode?.prerequisites.includes(id);
      });

      if (parentMissing) {
        edges.push({
          id: `e-bt-${id}-${parentMissing}`,
          source: `bt-${id}`,
          target: `missing-${parentMissing}`,
          style: { stroke: "#3b82f6", strokeWidth: 2 },
        });
      }
    });

    return { nodes, edges };
  }, [diagnosis, getMastery]);

  const [nodes, , onNodesChange] = useNodesState(flowNodes);
  const [edges, , onEdgesChange] = useEdgesState(flowEdges);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Error Analysis */}
      <div className="glass-card p-5 border-2 border-red-200 bg-red-50/30">
        <div className="flex items-center gap-2 mb-3">
          <XCircle className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-bold text-red-700">诊断分析</h3>
        </div>
        <div className="text-sm text-slate-700 leading-relaxed mb-4">
          <MathText text={diagnosis.errorAnalysis || ""} />
        </div>
        <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
          <MathText text={diagnosis.explanation} />
        </div>
      </div>

      {/* Backtrack Graph */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <RotateCcw className="w-5 h-5 text-blue-500" />
          <h3 className="text-sm font-bold text-slate-700">知识回溯路径图</h3>
          <span className="text-xs text-slate-400 ml-auto">
            点击节点查看详细信息
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200" style={{ height: "400px" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.4 }}
            minZoom={0.4}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
          >
            <Controls />
            <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#e2e8f0" />
          </ReactFlow>
        </div>
      </div>

      {/* Suggested Review */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-bold text-slate-700">建议复习路径</h3>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {diagnosis.suggestedReview.map((id, i) => {
            const kn = getKnowledgeNode(id);
            if (!kn) return null;
            return (
              <span key={id} className="flex items-center gap-1">
                <span
                  className="badge text-xs"
                  style={{
                    backgroundColor: `${CATEGORY_COLORS[kn.category]}15`,
                    color: CATEGORY_COLORS[kn.category],
                  }}
                >
                  {kn.name}
                </span>
                {i < diagnosis.suggestedReview.length - 1 && (
                  <ChevronRight className="w-3 h-3 text-slate-300" />
                )}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
