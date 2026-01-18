import { cn } from "@/lib/utils"

export default function SidebarLogo() {
  return (
    <div className={cn("flex items-center gap-2 px-5 py-6")}>
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
        )}
      >
        <span className={cn("text-sm font-semibold")}>P</span>
      </div>
      <div>
        <p className={cn("text-sm font-semibold text-slate-900 dark:text-slate-100")}>
          Prism
        </p>
        <p className={cn("text-xs text-slate-500 dark:text-slate-400")}>
          AI 学习中枢
        </p>
      </div>
    </div>
  )
}
