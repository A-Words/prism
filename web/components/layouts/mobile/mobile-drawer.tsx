"use client"

import { useEffect } from "react"
import { X } from "lucide-react"
import Sidebar from "@/components/layouts/sidebar"

type MobileDrawerProps = {
  isOpen: boolean
  onClose: () => void
}

export default function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  useEffect(() => {
    if (!isOpen) {
      return
    }

    // 打开抽屉时锁定背景滚动，关闭时恢复
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    // 监听 Esc 键关闭抽屉
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-40 md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="移动端导航菜单"
    >
      <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 h-dvh w-72">
        <Sidebar
          className="h-full w-full"
          onNavigate={onClose}
          headerAction={
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-md border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
              aria-label="关闭导航菜单"
            >
              <X className="h-4 w-4" />
            </button>
          }
        />
      </div>
    </div>
  )
}
