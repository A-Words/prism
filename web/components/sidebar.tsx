"use client"

import SidebarLogo from "@/components/sidebar/sidebar-logo"
import SidebarNavSection from "@/components/sidebar/sidebar-nav-section"
import SidebarUtility from "@/components/sidebar/sidebar-utility"
import {
  sidebarSections,
  sidebarUtilityItems,
} from "@/components/sidebar/sidebar-data"
import { cn } from "@/lib/utils"

export default function Sidebar() {
  return (
    <aside
      className={cn(
        "flex h-screen w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
      )}
    >
      <SidebarLogo />

      <div className={cn("flex-1 overflow-y-auto px-3")}>
        {sidebarSections.map((section) => (
          <SidebarNavSection
            key={section.label}
            label={section.label}
            items={section.items}
          />
        ))}
      </div>

      <SidebarUtility items={sidebarUtilityItems} />
    </aside>
  )
}
