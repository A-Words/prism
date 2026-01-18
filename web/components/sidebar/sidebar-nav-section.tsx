import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export type SidebarNavItem = {
  title: string
  href: string
  icon: LucideIcon
}

type SidebarNavSectionProps = {
  label: string
  items: SidebarNavItem[]
}

export default function SidebarNavSection({
  label,
  items,
}: SidebarNavSectionProps) {
  const pathname = usePathname()

  return (
    <div className={cn("mb-6")}>
      <p
        className={cn(
          "px-3 text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500"
        )}
      >
        {label}
      </p>
      <nav className={cn("mt-2 space-y-1")}>
        {items.map((item) => {
          const active = pathname === item.href
          const Icon = item.icon

          return (
            <Link
              key={item.title}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100"
              )}
            >
              <Icon className={cn("h-4 w-4")} />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
