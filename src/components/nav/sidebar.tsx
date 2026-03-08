"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Route,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    href: "/",
    label: "总览",
    icon: LayoutDashboard,
    description: "学习仪表盘",
  },
  {
    href: "/solve",
    label: "解题路径",
    icon: Route,
    description: "题目 → 路径图",
  },
  {
    href: "/learn",
    label: "学习路径",
    icon: GraduationCap,
    description: "知识 → 路径图",
  },
  {
    href: "/practice",
    label: "练习诊断",
    icon: ClipboardCheck,
    description: "作答 → 回溯分析",
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-white/90 backdrop-blur-xl">
      <div className="border-b border-slate-100 px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">Prism</h1>
            <p className="text-[11px] font-medium text-slate-400">数学学习导航</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-indigo-50 text-indigo-700 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  isActive ? "text-indigo-600" : "text-slate-400"
                )}
              />
              <div>
                <div>{item.label}</div>
                <div className={cn("text-[11px] font-normal", isActive ? "text-indigo-400" : "text-slate-400")}>
                  {item.description}
                </div>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[240px] border-r border-slate-200/60 lg:block">
        <SidebarContent />
      </aside>

      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white/90 text-slate-600 shadow-sm backdrop-blur lg:hidden"
        aria-label="打开导航"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px]"
            onClick={() => setMobileOpen(false)}
            aria-label="关闭导航遮罩"
          />
          <div className="absolute inset-y-0 left-0 w-[86vw] max-w-[300px] border-r border-slate-200/60 shadow-xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-500"
              aria-label="关闭导航"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
