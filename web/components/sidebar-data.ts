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

export type SidebarNavItem = {
  title: string
  href: string
  icon: LucideIcon
}

type SidebarSection = {
  label: string
  items: SidebarNavItem[]
}

export const sidebarSections: SidebarSection[] = [
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

export const sidebarUtilityItems: SidebarNavItem[] = [
  { title: "设置", href: "/settings", icon: Settings },
]
