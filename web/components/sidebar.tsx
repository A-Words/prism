"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Activity,
  BookOpen,
  Brain,
  ClipboardList,
  HeartPulse,
  LayoutDashboard,
  NotebookPen,
  Settings,
} from "lucide-react"

const sections = [
  {
    label: "概览",
    items: [
      { title: "仪表盘", href: "/", icon: LayoutDashboard },
      { title: "学习路径", href: "/learning-path", icon: BookOpen },
      { title: "测评中心", href: "/assessment", icon: ClipboardList },
    ],
  },
  {
    label: "智能能力",
    items: [
      { title: "虚拟导师", href: "/assistant", icon: Brain },
      { title: "智能笔记", href: "/notes", icon: NotebookPen },
      { title: "情绪与专注", href: "/emotion", icon: Activity },
      { title: "健康管理", href: "/health", icon: HeartPulse },
    ],
  },
]

const utility = [
  { title: "设置", href: "/settings", icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 px-5 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
          <span className="text-sm font-semibold">P</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Prism</p>
          <p className="text-xs text-slate-500">AI 学习中枢</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3">
        {sections.map((section) => (
          <div key={section.label} className="mb-6">
            <p className="px-3 text-xs font-medium uppercase tracking-wider text-slate-400">
              {section.label}
            </p>
            <nav className="mt-2 space-y-1">
              {section.items.map((item) => {
                const active = pathname === item.href
                const Icon = item.icon

                return (
                  <Link
                    key={item.title}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-slate-100 text-slate-900"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 px-3 py-4">
        <nav className="space-y-1">
          {utility.map((item) => {
            const active = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.title}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{item.title}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
