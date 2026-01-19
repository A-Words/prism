import {
  Activity,
  BookOpen,
  Brain,
  ClipboardList,
  HeartPulse,
  LayoutDashboard,
  NotebookPen,
  Settings,
  type LucideIcon,
} from "lucide-react"

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
}

export type NavSection = {
  label: string
  items: NavItem[]
}

// 主导航分组
export const navMain: NavSection[] = [
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

// 次级导航项
export const navSecondary: NavItem[] = [
  { title: "设置", href: "/settings", icon: Settings },
]
