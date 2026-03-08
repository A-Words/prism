"use client";

import Link from "next/link";
import {
  Route,
  GraduationCap,
  ClipboardCheck,
  TrendingUp,
  BookOpen,
  Target,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Zap,
  RotateCcw,
  Brain,
  Play,
} from "lucide-react";
import { getKnowledgeNode, knowledgeNodes } from "@/lib/knowledge-graph";
import {
  useAppStore,
  getWeakPoints,
  getLatestDiagnosisRecord,
  getRecentPractice,
  getDailyRecommendation,
} from "@/lib/store";
import { getLearnHref, getMockQuestionById, mockQuestions } from "@/lib/mock-data";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  MASTERY_COLORS,
  type KnowledgeCategory,
} from "@/types";

export default function HomePage() {
  const progress = useAppStore((s) => s.progress);
  const getMastery = useAppStore((s) => s.getMastery);

  const weakPoints = getWeakPoints(progress);
  const recentPractice = getRecentPractice(progress, 5);
  const latestDiagnosis = getLatestDiagnosisRecord(progress);
  const recommendation = getDailyRecommendation(progress);

  const totalPracticed = progress.practiceHistory.length;
  const correctCount = progress.practiceHistory.filter((p) => p.isCorrect).length;
  const accuracy = totalPracticed > 0 ? Math.round((correctCount / totalPracticed) * 100) : 0;
  const knowledgeMastered = Object.values(progress.knowledge).filter(
    (k) => k.mastery === "high" || k.mastery === "full"
  ).length;

  const hasHistory = totalPracticed > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">学习驾驶舱</h1>
            <p className="text-sm text-slate-500">
              {hasHistory
                ? `已练习 ${totalPracticed} 题 · 正确率 ${accuracy}% · 掌握 ${knowledgeMastered} 个知识点`
                : "开始你的高中数学学习之旅"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Clock className="w-4 h-4" />
          {new Date().toLocaleDateString("zh-CN", {
            month: "long",
            day: "numeric",
            weekday: "long",
          })}
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            icon: BookOpen,
            label: "已练习",
            value: totalPracticed,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            icon: Target,
            label: "正确率",
            value: totalPracticed > 0 ? `${accuracy}%` : "—",
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
          {
            icon: TrendingUp,
            label: "已掌握",
            value: `${knowledgeMastered}/${knowledgeNodes.length}`,
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4 flex items-center gap-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${stat.bg}`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <div className="text-xl font-bold text-slate-900">{stat.value}</div>
              <div className="text-xs text-slate-500">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Today's Tasks + Weak Points */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section A: 今日学习任务 */}
          <section className="dashboard-section">
            <div className="flex items-center gap-2 mb-5">
              <Zap className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-bold text-slate-900">今日学习任务</h2>
            </div>

            <div className="space-y-3">
              {/* Continue learning path */}
              {recommendation.continuePath ? (
                <Link href={recommendation.continuePath.href} className="task-card flex items-center gap-4 group">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 shrink-0">
                    <RotateCcw className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800">
                      继续学习：{recommendation.continuePath.targetName}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      进度 {recommendation.continuePath.currentStep}/{recommendation.continuePath.totalSteps} ·
                      接着上次继续
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0" />
                </Link>
              ) : (
                <Link href="/learn" className="task-card flex items-center gap-4 group">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-50 shrink-0">
                    <Play className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800">
                      开始你的第一条学习路径
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      选择一个目标知识点，系统为你规划路径
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors shrink-0" />
                </Link>
              )}

              {/* Recommended knowledge points */}
              {recommendation.recommendedKnowledge.map((k) => (
                <Link
                  key={k.id}
                  href={k.href}
                  className="task-card flex items-center gap-4 group"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 shrink-0">
                    <Brain className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800">
                      推荐学习：{k.name}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {k.reason}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors shrink-0" />
                </Link>
              ))}

              {/* Targeted practice */}
              <Link
                href="/practice"
                className="task-card flex items-center gap-4 group"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 shrink-0">
                  <ClipboardCheck className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800">
                    针对性练习
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {weakPoints.length > 0
                      ? `建议完成 ${recommendation.practiceCount} 道题，重点巩固薄弱环节`
                      : "完成一组练习，检测学习效果"}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-500 transition-colors shrink-0" />
              </Link>
            </div>
          </section>

          {/* Section B: 当前薄弱点 */}
          <section className="dashboard-section">
            <div className="flex items-center gap-2 mb-5">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              <h2 className="text-lg font-bold text-slate-900">当前薄弱点</h2>
              {weakPoints.length === 0 && (
                <span className="text-xs text-slate-400 ml-2">
                  完成练习后会自动检测薄弱环节
                </span>
              )}
            </div>

            {weakPoints.length > 0 ? (
              <div className="space-y-3">
                {weakPoints.slice(0, 5).map((wp) => (
                  <div
                    key={wp.nodeId}
                    className="weak-point-tag"
                    style={{
                      borderColor: `${CATEGORY_COLORS[wp.category as KnowledgeCategory]}40`,
                    }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: MASTERY_COLORS[wp.mastery],
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-800">
                          {wp.nodeName}
                        </span>
                        <span
                          className="badge text-xs"
                          style={{
                            backgroundColor: `${CATEGORY_COLORS[wp.category as KnowledgeCategory]}15`,
                            color: CATEGORY_COLORS[wp.category as KnowledgeCategory],
                          }}
                        >
                          {CATEGORY_LABELS[wp.category as KnowledgeCategory]}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {wp.reason}
                      </div>
                    </div>
                    <Link
                      href={getLearnHref(wp.nodeId, wp.nodeName)}
                      className="text-xs text-indigo-500 hover:text-indigo-700 font-medium whitespace-nowrap"
                    >
                      去巩固 →
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-slate-400">
                <Target className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p>还没有练习数据</p>
                <p className="mt-1">
                  去{" "}
                  <Link href="/practice" className="text-indigo-500 hover:underline">
                    练习
                  </Link>{" "}
                  做几道题，系统会自动帮你找出薄弱点
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Right column: Recent Diagnosis + Tool Entries */}
        <div className="space-y-6">
          {/* Section C: 最近诊断结果 */}
          <section className="dashboard-section">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardCheck className="w-5 h-5 text-blue-500" />
              <h2 className="text-base font-bold text-slate-900">最近诊断</h2>
            </div>

            {latestDiagnosis ? (
              <div className="space-y-4">
                <Link
                  href={latestDiagnosis.href}
                  className="block rounded-2xl border border-blue-200 bg-blue-50/80 p-4 transition-colors hover:border-blue-300"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-slate-800">
                        {latestDiagnosis.diagnosis.recoveryTitle || "回到前置知识继续补强"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        错因：{latestDiagnosis.diagnosis.errorCategoryLabel} · 推荐回补：
                        {getKnowledgeNode(latestDiagnosis.diagnosis.recommendedLearnTargetId || "")?.name ||
                          "学习路径"}
                      </div>
                    </div>
                  </div>
                </Link>
                <div className="space-y-2">
                  {recentPractice.map((record) => {
                    const question = getMockQuestionById(record.questionId);
                    return (
                      <div
                        key={`${record.questionId}-${record.timestamp}`}
                        className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0"
                      >
                        {record.isCorrect ? (
                          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-slate-700 truncate">
                            {question
                              ? question.problem.replace(/\$[^$]*\$/g, "…").slice(0, 30)
                              : `题目 ${record.questionId}`}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {record.isCorrect ? "正确" : "错误"} ·{" "}
                            {new Date(record.timestamp).toLocaleDateString("zh-CN", {
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : recentPractice.length > 0 ? (
              <div className="space-y-2">
                {recentPractice.map((record) => {
                  const question = mockQuestions.find((q) => q.id === record.questionId);
                  return (
                    <div
                      key={`${record.questionId}-${record.timestamp}`}
                      className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0"
                    >
                      {record.isCorrect ? (
                        <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-slate-700 truncate">
                          {question
                            ? question.problem.replace(/\$[^$]*\$/g, "…").slice(0, 30)
                            : `题目 ${record.questionId}`}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          {record.isCorrect ? "正确" : "错误"} ·{" "}
                          {new Date(record.timestamp).toLocaleDateString("zh-CN", {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-slate-400">
                <Clock className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                <p>还没有诊断记录</p>
              </div>
            )}
          </section>

          {/* Section D: 功能入口 */}
          <section className="dashboard-section">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              <h2 className="text-base font-bold text-slate-900">工具</h2>
            </div>

            <div className="space-y-2">
              <ToolEntry
                href="/solve"
                icon={Route}
                title="解题路径图"
                description="将题目转化为思维步骤图"
                color="from-blue-500 to-cyan-500"
              />
              <ToolEntry
                href="/learn"
                icon={GraduationCap}
                title="学习路径图"
                description="生成个性化知识学习路径"
                color="from-emerald-500 to-teal-500"
              />
              <ToolEntry
                href="/practice"
                icon={ClipboardCheck}
                title="练习诊断"
                description="做题、诊断、回溯薄弱点"
                color="from-amber-500 to-orange-500"
              />
            </div>
          </section>

          {/* Mastery Mini Map */}
          <section className="dashboard-section">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-5 h-5 text-indigo-500" />
              <h2 className="text-base font-bold text-slate-900">掌握概览</h2>
            </div>
            <div className="space-y-3">
              {(Object.keys(CATEGORY_LABELS) as KnowledgeCategory[]).map(
                (cat) => {
                  const nodes = knowledgeNodes.filter((n) => n.category === cat);
                  const mastered = nodes.filter((n) => {
                    const m = getMastery(n.id);
                    return m === "high" || m === "full";
                  }).length;
                  const pct = nodes.length > 0 ? Math.round((mastered / nodes.length) * 100) : 0;

                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[cat] }}
                      />
                      <span className="text-sm text-slate-700 w-16 shrink-0">
                        {CATEGORY_LABELS[cat]}
                      </span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: CATEGORY_COLORS[cat],
                          }}
                        />
                      </div>
                      <span className="text-xs text-slate-400 w-12 text-right">
                        {mastered}/{nodes.length}
                      </span>
                    </div>
                  );
                }
              )}
            </div>

            {/* Mastery legend */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100">
              {(
                [
                  ["未学习", "none"],
                  ["初步", "low"],
                  ["部分", "medium"],
                  ["掌握", "high"],
                  ["精通", "full"],
                ] as const
              ).map(([label, level]) => (
                <div key={level} className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: MASTERY_COLORS[level] }}
                  />
                  <span className="text-[10px] text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ToolEntry({
  href,
  icon: Icon,
  title,
  description,
  color,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group"
    >
      <div
        className={`flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br ${color} text-white shrink-0`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        <div className="text-xs text-slate-500">{description}</div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
    </Link>
  );
}
