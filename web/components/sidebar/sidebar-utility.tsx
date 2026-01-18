import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type SidebarUtilityItem = {
  title: string
  href: string
  icon: LucideIcon
}

type SidebarUtilityProps = {
  items: SidebarUtilityItem[]
}

export default function SidebarUtility({ items }: SidebarUtilityProps) {
  const pathname = usePathname()

  return (
    <div className={cn("border-t border-slate-200 px-3 py-4 dark:border-slate-800")}>
      <nav className={cn("space-y-1")}>
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
          )}
        ))}
      </nav>
    </div>
  )
}
