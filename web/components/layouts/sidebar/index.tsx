"use client"

import SidebarLogo from "@/components/layouts/sidebar/sidebar-logo"
import SidebarNavSection from "@/components/layouts/sidebar/sidebar-nav-section"
import SidebarUtility from "@/components/layouts/sidebar/sidebar-utility"
import {
  sidebarSections,
  sidebarUtilityItems,
} from "@/components/layouts/sidebar/sidebar-data"
import { cn } from "@/lib/utils"

type SidebarProps = {
  className?: string
  onNavigate?: () => void
  headerAction?: React.ReactNode
}

export default function Sidebar({
  className,
  onNavigate,
  headerAction,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-dvh w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
        className
      )}
    >
      <SidebarLogo action={headerAction} />

      <div className="flex-1 overflow-y-auto px-3">
        {sidebarSections.map((section) => (
          <SidebarNavSection
            key={section.label}
            label={section.label}
            items={section.items}
            onNavigate={onNavigate}
          />
        ))}
      </div>

      <SidebarUtility items={sidebarUtilityItems} onNavigate={onNavigate} />
    </aside>
  )
}
