import { Menu } from "lucide-react"

type MobileHeaderProps = {
  onMenuClick: () => void
}

export default function MobileHeader({ onMenuClick }: MobileHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950 md:hidden">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
          <span className="text-xs font-semibold">P</span>
        </div>
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Prism
        </span>
      </div>
      <button
        type="button"
        onClick={onMenuClick}
        className="inline-flex items-center justify-center rounded-md border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900"
        aria-label="打开导航菜单"
      >
        <Menu className="h-5 w-5" />
      </button>
    </header>
  )
}
