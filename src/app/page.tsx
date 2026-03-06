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
} from "lucide-react";
import { knowledgeNodes } from "@/lib/knowledge-graph";
import { useAppStore } from "@/lib/store";
import {
  CATEGORY_COLORS,
  CATEGORY_LABELS,
  MASTERY_COLORS,
  type KnowledgeCategory,
} from "@/types";

export default function HomePage() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              欢迎使用 Prism
            </h1>
            <p className="text-sm text-slate-500">
              AI 驱动的高中数学学习导航系统
            </p>
          </div>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <FeatureCard
          href="/solve"
          icon={Route}
          title="解题路径图"
          description="输入数学题目，AI 将其分解为可视化的解题步骤路径图，揭示每一步背后的知识逻辑。"
          color="from-blue-500 to-cyan-500"
          shadowColor="shadow-blue-100"
        />
        <FeatureCard
          href="/learn"
          icon={GraduationCap}
          title="学习路径图"
          description="选择目标知识点，系统自动生成从前置知识到目标的最优学习路径，标注你的掌握程度。"
          color="from-emerald-500 to-teal-500"
          shadowColor="shadow-emerald-100"
        />
        <FeatureCard
          href="/practice"
          icon={ClipboardCheck}
          title="练习诊断"
          description="智能练习系统会分析你的作答，精确定位薄弱环节，动态回溯到需要巩固的前置知识。"
          color="from-amber-500 to-orange-500"
          shadowColor="shadow-amber-100"
        />
      </div>

      {/* Knowledge Mastery Overview */}
      <MasteryOverview />

      {/* Quick Stats */}
      <QuickStats />
    </div>
  );
}

function FeatureCard({
  href,
  icon: Icon,
  title,
  description,
  color,
  shadowColor,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  color: string;
  shadowColor: string;
}) {
  return (
    <Link
      href={href}
      className={`glass-card p-6 group hover:translate-y-[-2px] transition-all duration-200 ${shadowColor}`}
    >
      <div
        className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${color} text-white mb-4 shadow-lg`}
      >
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
        {title}
        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
      </h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </Link>
  );
}

function MasteryOverview() {
  const getMastery = useAppStore((s) => s.getMastery);

  const categories = Object.keys(CATEGORY_LABELS) as KnowledgeCategory[];

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-2 mb-5">
        <Target className="w-5 h-5 text-indigo-500" />
        <h2 className="text-lg font-bold text-slate-900">知识掌握总览</h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {categories.map((cat) => {
          const nodes = knowledgeNodes.filter((n) => n.category === cat);
          const masteryDistribution = {
            none: 0,
            low: 0,
            medium: 0,
            high: 0,
            full: 0,
          };
          nodes.forEach((n) => {
            const m = getMastery(n.id);
            masteryDistribution[m]++;
          });

          return (
            <div key={cat} className="text-center">
              <div
                className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: CATEGORY_COLORS[cat] }}
              >
                {nodes.length}
              </div>
              <div className="text-sm font-semibold text-slate-700 mb-2">
                {CATEGORY_LABELS[cat]}
              </div>
              <div className="flex gap-0.5 justify-center">
                {nodes.map((n) => (
                  <div
                    key={n.id}
                    className="w-2 h-6 rounded-full"
                    style={{
                      backgroundColor: MASTERY_COLORS[getMastery(n.id)],
                    }}
                    title={`${n.name}: ${getMastery(n.id)}`}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-6 mt-5 pt-4 border-t border-slate-100">
        {(
          [
            ["未学习", "none"],
            ["初步了解", "low"],
            ["部分掌握", "medium"],
            ["基本掌握", "high"],
            ["完全掌握", "full"],
          ] as const
        ).map(([label, level]) => (
          <div key={level} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: MASTERY_COLORS[level] }}
            />
            <span className="text-xs text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickStats() {
  const progress = useAppStore((s) => s.progress);

  const totalPracticed = progress.practiceHistory.length;
  const correctCount = progress.practiceHistory.filter((p) => p.isCorrect).length;
  const accuracy = totalPracticed > 0 ? Math.round((correctCount / totalPracticed) * 100) : 0;
  const knowledgeMastered = Object.values(progress.knowledge).filter(
    (k) => k.mastery === "high" || k.mastery === "full"
  ).length;

  const stats = [
    {
      icon: BookOpen,
      label: "已练习题目",
      value: totalPracticed,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      icon: Target,
      label: "正确率",
      value: `${accuracy}%`,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      icon: TrendingUp,
      label: "已掌握知识点",
      value: `${knowledgeMastered}/${knowledgeNodes.length}`,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {stats.map((stat) => (
        <div key={stat.label} className="glass-card p-5 flex items-center gap-4">
          <div
            className={`flex items-center justify-center w-12 h-12 rounded-xl ${stat.bg}`}
          >
            <stat.icon className={`w-6 h-6 ${stat.color}`} />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
            <div className="text-sm text-slate-500">{stat.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
