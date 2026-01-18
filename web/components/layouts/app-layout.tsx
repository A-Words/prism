"use client"

import { useState } from "react"
import Sidebar from "@/components/layouts/sidebar"
import MobileHeader from "@/components/layouts/mobile/mobile-header"
import MobileDrawer from "@/components/layouts/mobile/mobile-drawer"

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="flex min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* 桌面端侧边栏 */}
      <Sidebar className="hidden md:flex" />

      <div className="flex min-h-dvh flex-1 flex-col">
        {/* 移动端顶部栏 */}
        <MobileHeader onMenuClick={() => setIsMobileMenuOpen(true)} />

        {/* 主内容区 */}
        <main className="min-h-dvh px-6 py-8 md:px-8 md:py-10">{children}</main>
      </div>

      {/* 移动端抽屉 */}
      <MobileDrawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
    </div>
  )
}
